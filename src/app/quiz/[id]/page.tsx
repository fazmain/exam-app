"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, Timestamp, collection } from "firebase/firestore";
import { Quiz, Question } from "@/lib/types";
import { shuffleArray } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import katex from "katex";
import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import { QuizResults } from "@/components/QuizResults";

const MathPreview = ({ text }: { text: string }) => {
    if (!text) return <span></span>;

    try {
        const parts: React.ReactElement[] = [];
        let currentIndex = 0;
        let inMath = false;
        let mathStart = -1;

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '$') {
                if (inMath) {
                    const mathText = text.substring(mathStart + 1, i);
                    try {
                        const html = katex.renderToString(mathText, {
                            throwOnError: false,
                            displayMode: false,
                        });
                        parts.push(<span key={i} dangerouslySetInnerHTML={{ __html: html }} />);
                    } catch {
                        parts.push(<span key={i}>${mathText}$</span>);
                    }
                    currentIndex = i + 1;
                    inMath = false;
                } else {
                    if (i > currentIndex) {
                        const mdText = text.substring(currentIndex, i);
                        parts.push(
                            <span key={currentIndex} className="inline-block">
                                <ReactMarkdown>{mdText}</ReactMarkdown>
                            </span>
                        );
                    }
                    mathStart = i;
                    inMath = true;
                }
            }
        }

        if (currentIndex < text.length) {
            const mdText = text.substring(currentIndex);
            parts.push(
                <span key={currentIndex} className="inline-block">
                    <ReactMarkdown>{mdText}</ReactMarkdown>
                </span>
            );
        }

        return <div className="prose dark:prose-invert max-w-none flex flex-wrap gap-1 items-center">{parts}</div>;
    } catch (e) {
        return <span>{text}</span>;
    }
};

export default function QuizPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const router = useRouter();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<number | null>(null); // in seconds

    const handleSubmit = useCallback(async (autoSubmit = false) => {
        if (!quiz || !user) return;

        let calculatedScore = 0;
        const pointsPerQuestion = quiz.settings?.pointsPerQuestion || 1;
        const negativePoints = quiz.settings?.negativeMarkingPoints || 0;

        questions.forEach((q) => {
            const selectedOptionId = answers[q.id];
            const correctOption = q.options.find((o) => o.isCorrect);

            if (selectedOptionId && correctOption && selectedOptionId === correctOption.id) {
                calculatedScore += pointsPerQuestion;
            } else if (selectedOptionId && quiz.settings?.negativeMarking) {
                calculatedScore -= negativePoints;
            }
        });

        setScore(calculatedScore);
        setSubmitted(true);

        try {
            await addDoc(collection(db, "attempts"), {
                quizId: quiz.id,
                quizTitle: quiz.title,
                studentId: user.uid,
                studentEmail: user.email,
                answers,
                score: calculatedScore,
                totalQuestions: questions.length,
                completedAt: Timestamp.now(),
                settings: quiz.settings
            });
            if (autoSubmit) {
                toast.info("Time's up! Quiz submitted automatically.");
            } else {
                toast.success("Quiz submitted!");
            }
        } catch (error) {
            console.error("Error submitting quiz:", error);
            toast.error("Failed to save attempt.");
        }
    }, [quiz, user, answers, questions]);

    useEffect(() => {
        const fetchQuiz = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "quizzes", id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const quizData = { id: docSnap.id, ...docSnap.data() } as Quiz;
                    setQuiz(quizData);

                    // Handle Randomization
                    let displayQuestions = [...quizData.questions];
                    if (quizData.settings?.randomizeQuestions) {
                        displayQuestions = shuffleArray(displayQuestions);
                    }

                    // Handle Per-Question Option Randomization
                    displayQuestions = displayQuestions.map(q => ({
                        ...q,
                        options: q.randomizeOptions ? shuffleArray(q.options) : q.options
                    }));

                    setQuestions(displayQuestions);

                    // Handle Timer
                    if (quizData.settings?.timer && quizData.settings.timer > 0) {
                        const storageKey = `quiz_end_time_${id}_${user?.uid}`;
                        const storedEndTime = localStorage.getItem(storageKey);

                        if (storedEndTime) {
                            const endTime = parseInt(storedEndTime);
                            const now = Date.now();
                            const remaining = Math.ceil((endTime - now) / 1000);

                            if (remaining > 0) {
                                setTimeLeft(remaining);
                            } else {
                                setTimeLeft(0);
                                // If time is up but not submitted, it will be handled by the useEffect
                            }
                        } else {
                            const durationInSeconds = quizData.settings.timer * 60;
                            const endTime = Date.now() + durationInSeconds * 1000;
                            localStorage.setItem(storageKey, endTime.toString());
                            setTimeLeft(durationInSeconds);
                        }
                    }
                } else {
                    toast.error("Quiz not found");
                    router.push("/student/dashboard");
                }
            } catch (error) {
                console.error("Error fetching quiz:", error);
                toast.error("Error loading quiz");
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [id, router, user]);

    useEffect(() => {
        if (timeLeft === null || submitted) {
            if (submitted && quiz && user) {
                localStorage.removeItem(`quiz_end_time_${quiz.id}_${user.uid}`);
            }
            return;
        }

        if (timeLeft <= 0) {
            handleSubmit(true); // Auto-submit on timer end
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 0) return 0;
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft, submitted, handleSubmit, quiz, user]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
    if (!quiz) return <div className="flex h-screen items-center justify-center">Quiz not found</div>;

    if (submitted) {
        return (
            <QuizResults
                quizTitle={quiz.title}
                score={score}
                questions={questions}
                answers={answers}
            />
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-10 space-y-8 px-4 pb-24">
            <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur py-4 z-10 border-b">
                <div>
                    <h1 className="text-2xl font-bold">{quiz.title}</h1>
                    <p className="text-gray-500 text-sm">Question {Object.keys(answers).length} of {questions.length} answered</p>
                </div>
                {timeLeft !== null && (
                    <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-primary'}`}>
                        <Clock className="h-5 w-5" />
                        {formatTime(timeLeft)}
                    </div>
                )}
            </div>

            <div className="space-y-8">
                {questions.map((q, index) => (
                    <Card key={q.id}>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <span className="font-bold text-lg text-gray-400">Q{index + 1}</span>
                                    <div className="flex-1">
                                        <div className="text-lg font-medium mb-4">
                                            <MathPreview text={q.text} />
                                        </div>
                                        {q.imageUrl && (
                                            <img src={q.imageUrl} alt="Question" className="max-h-60 rounded-lg border mb-4" />
                                        )}

                                        <RadioGroup
                                            value={answers[q.id]}
                                            onValueChange={(value) => setAnswers({ ...answers, [q.id]: value })}
                                        >
                                            {q.options.map((option) => (
                                                <div key={option.id} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                                                    <RadioGroupItem value={option.id} id={`${q.id}-${option.id}`} />
                                                    <Label htmlFor={`${q.id}-${option.id}`} className="flex-1 cursor-pointer font-normal">
                                                        {option.text}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
                <div className="max-w-3xl mx-auto">
                    <Button size="lg" className="w-full" onClick={() => handleSubmit(false)}>
                        Submit Quiz
                    </Button>
                </div>
            </div>
        </div>
    );
}
