"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { Quiz, Question } from "@/lib/types";
import { shuffleArray } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { QuizResults } from "@/components/QuizResults";
import { MathPreview } from "@/components/MathPreview";

export default function QuizClient() {
    const { id } = useParams();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<number | null>(null); // in seconds
    const [startTime, setStartTime] = useState<number | null>(null);
    const [studentData, setStudentData] = useState<any>(null);

    const [hasStarted, setHasStarted] = useState(false);

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

        const endTime = Date.now();
        const timeTaken = startTime ? Math.floor((endTime - startTime) / 1000) : 0;

        try {
            await addDoc(collection(db, "attempts"), {
                quizId: quiz.id,
                quizTitle: quiz.title,
                studentId: user.uid,
                studentEmail: user.email,
                studentName: studentData?.name || user.displayName || "Unknown",
                studentIdNum: studentData?.studentId || "N/A", // Use studentIdNum to avoid conflict with user uid
                answers,
                score: calculatedScore,
                totalQuestions: questions.length,
                completedAt: Timestamp.now(),
                timeTaken,
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
    }, [quiz, user, answers, questions, startTime, studentData]);

    useEffect(() => {
        if (!authLoading && !user) {
            // Store the intended destination in localStorage
            localStorage.setItem('redirectAfterLogin', `/quiz/${id}`);
            router.push("/login");
            return;
        }

        if (user && !user.emailVerified) {
            router.push("/verify-email");
            return;
        }

        const fetchData = async () => {
            if (!id || !user) return;
            try {
                // Fetch User Data
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    setStudentData(userDoc.data());
                }

                // Fetch Quiz
                const docRef = doc(db, "quizzes", id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const quizData = { id: docSnap.id, ...docSnap.data() } as Quiz;

                    // Check if active
                    if (quizData.settings && quizData.settings.isActive === false) {
                        toast.error("This quiz is currently not accepting responses.");
                        router.push("/student/dashboard");
                        return;
                    }

                    // Check for existing attempts if retakes are not allowed
                    if (quizData.settings && quizData.settings.allowRetakes === false) {
                        const attemptsQuery = query(
                            collection(db, "attempts"),
                            where("quizId", "==", id),
                            where("studentId", "==", user.uid)
                        );
                        const attemptsSnap = await getDocs(attemptsQuery);
                        if (!attemptsSnap.empty) {
                            toast.error("You have already taken this quiz.");
                            router.push("/student/dashboard");
                            return;
                        }
                    }

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

                    // Handle Timer - Only set initial time here, don't start it
                    if (quizData.settings?.timer && quizData.settings.timer > 0) {
                        const durationInSeconds = quizData.settings.timer * 60;
                        setTimeLeft(durationInSeconds);
                    }
                } else {
                    toast.error("Quiz not found");
                    router.push("/student/dashboard");
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Error loading quiz");
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchData();
        }
    }, [id, router, user, authLoading]);

    // Timer Effect - Only runs when hasStarted is true
    useEffect(() => {
        if (!hasStarted || timeLeft === null || submitted) {
            if (submitted && quiz && user) {
                localStorage.removeItem(`quiz_end_time_${quiz.id}_${user.uid}`);
            }
            return;
        }

        // Initialize persistence when starting
        if (hasStarted && quiz && quiz.settings?.timer && quiz.settings.timer > 0) {
            const storageKey = `quiz_end_time_${quiz.id}_${user?.uid}`;
            const storedEndTime = localStorage.getItem(storageKey);

            if (!storedEndTime) {
                const durationInSeconds = quiz.settings.timer * 60;
                const endTime = Date.now() + durationInSeconds * 1000;
                localStorage.setItem(storageKey, endTime.toString());
            } else {
                // Sync with stored time if exists (e.g. refresh)
                const endTime = parseInt(storedEndTime);
                const now = Date.now();
                const remaining = Math.ceil((endTime - now) / 1000);
                if (remaining > 0) {
                    setTimeLeft(remaining);
                } else {
                    setTimeLeft(0);
                }
            }
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
    }, [timeLeft, submitted, handleSubmit, quiz, user, hasStarted]);

    const handleStart = () => {
        setHasStarted(true);
        setStartTime(Date.now());
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (authLoading || loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
    if (!user) return null; // Should redirect
    if (!quiz) return <div className="flex h-screen items-center justify-center">Quiz not found</div>;

    if (submitted) {
        return (
            <QuizResults
                quizId={quiz.id}
                quizTitle={quiz.title}
                score={score}
                questions={questions}
                answers={answers}
                allowRetakes={quiz.settings?.allowRetakes}
            />
        );
    }

    if (!hasStarted) {
        return (
            <div className="max-w-2xl mx-auto py-20 px-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl text-center">{quiz.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center text-gray-600">
                            <p className="mb-4">{quiz.description || "No description provided."}</p>
                            <div className="flex justify-center gap-8 text-sm">
                                <div className="flex flex-col items-center">
                                    <span className="font-bold">{questions.length}</span>
                                    <span>Questions</span>
                                </div>
                                {quiz.settings?.timer ? (
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold">{quiz.settings.timer} min</span>
                                        <span>Time Limit</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold">None</span>
                                        <span>Time Limit</span>
                                    </div>
                                )}
                                <div className="flex flex-col items-center">
                                    <span className="font-bold">{quiz.settings?.pointsPerQuestion || 1}</span>
                                    <span>Points/Q</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <h3 className="font-semibold flex items-center gap-2 mb-2 text-yellow-800 dark:text-yellow-200">
                                <AlertTriangle className="h-4 w-4" /> Instructions
                            </h3>
                            <ul className="list-disc list-inside text-sm space-y-1 text-yellow-700 dark:text-yellow-300">
                                <li>Once you start, the timer will begin (if applicable).</li>
                                <li>Do not refresh the page unless necessary.</li>
                                {quiz.settings?.negativeMarking && (
                                    <li>Negative marking is enabled (-{quiz.settings.negativeMarkingPoints} per wrong answer).</li>
                                )}
                                {quiz.settings?.lockedAnswers && (
                                    <li><strong>Locked Answers:</strong> You cannot change your answer once you select an option.</li>
                                )}
                                <li>Click "Submit Quiz" when you are finished.</li>
                            </ul>
                        </div>

                        <Button size="lg" className="w-full" onClick={handleStart}>
                            Start Quiz
                        </Button>
                    </CardContent>
                </Card>
            </div>
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
                                            disabled={quiz.settings?.lockedAnswers && !!answers[q.id]}
                                        >
                                            {q.options.map((option) => (
                                                <div
                                                    key={option.id}
                                                    className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors cursor-pointer ${answers[q.id] === option.id ? 'bg-accent' : 'hover:bg-accent'}`}
                                                    onClick={() => {
                                                        if (!quiz.settings?.lockedAnswers || !answers[q.id]) {
                                                            setAnswers({ ...answers, [q.id]: option.id });
                                                        }
                                                    }}
                                                >
                                                    <RadioGroupItem value={option.id} id={`${q.id}-${option.id}`} />
                                                    <Label htmlFor={`${q.id}-${option.id}`} className="flex-1 cursor-pointer font-normal flex flex-col pointer-events-none">
                                                        <div className="flex items-center gap-2">
                                                            <MathPreview text={option.text} />
                                                        </div>
                                                        {option.imageUrl && (
                                                            <img src={option.imageUrl} alt="Option" className="mt-2 max-h-32 rounded border self-start" />
                                                        )}
                                                    </Label>
                                                    {quiz.settings?.lockedAnswers && answers[q.id] && answers[q.id] !== option.id && (
                                                        <Lock className="h-4 w-4 text-gray-400" />
                                                    )}
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
