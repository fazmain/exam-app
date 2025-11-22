"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Option {
    id: string;
    text: string;
    isCorrect: boolean;
}

interface Question {
    id: string;
    text: string;
    options: Option[];
    imageUrl?: string;
}

interface Quiz {
    id: string;
    title: string;
    description: string;
    questions: Question[];
}

const MathRenderer = ({ text }: { text: string }) => {
    if (!text) return <span></span>;

    try {
        // Split text by $ delimiters for inline math
        const parts: React.ReactElement[] = [];
        let currentIndex = 0;
        let inMath = false;
        let mathStart = -1;

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '$') {
                if (inMath) {
                    // End of math expression
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
                    // Start of math expression
                    if (i > currentIndex) {
                        // Add normal text before math
                        parts.push(<span key={currentIndex}>{text.substring(currentIndex, i)}</span>);
                    }
                    mathStart = i;
                    inMath = true;
                }
            }
        }

        // Add remaining text
        if (currentIndex < text.length) {
            parts.push(<span key={currentIndex}>{text.substring(currentIndex)}</span>);
        }

        return <>{parts}</>;
    } catch (e) {
        return <span>{text}</span>;
    }
};

export default function QuizPage() {
    const { id } = useParams();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push(`/login?redirect=/quiz/${id}`);
            return;
        }

        const fetchQuiz = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "quizzes", id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setQuiz({ id: docSnap.id, ...docSnap.data() } as Quiz);
                } else {
                    toast.error("Quiz not found");
                }
            } catch (error) {
                console.error("Error fetching quiz:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchQuiz();
        }
    }, [id, user, authLoading, router]);

    const handleOptionSelect = (questionId: string, optionId: string) => {
        if (submitted) return;
        setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmit = async () => {
        if (!quiz || !user) return;

        // Calculate score
        let calculatedScore = 0;
        quiz.questions.forEach((q) => {
            const selectedOptionId = answers[q.id];
            const correctOption = q.options.find((o) => o.isCorrect);
            if (selectedOptionId && correctOption && selectedOptionId === correctOption.id) {
                calculatedScore++;
            }
        });

        setScore(calculatedScore);
        setSubmitted(true);

        // Save attempt
        try {
            await addDoc(collection(db, "attempts"), {
                quizId: quiz.id,
                studentId: user.uid,
                studentEmail: user.email,
                answers,
                score: calculatedScore,
                totalQuestions: quiz.questions.length,
                completedAt: Timestamp.now(),
            });
            toast.success("Quiz submitted!");
        } catch (error) {
            console.error("Error saving attempt:", error);
            toast.error("Failed to save result.");
        }
    };

    if (authLoading || loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!quiz) {
        return <div className="flex h-screen items-center justify-center">Quiz not found</div>;
    }

    if (submitted) {
        return (
            <div className="max-w-3xl mx-auto py-10 space-y-8 text-center">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl">Quiz Completed!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-5xl font-bold text-blue-600">
                            {score} / {quiz.questions.length}
                        </div>
                        <p className="text-gray-500">Your score has been recorded.</p>
                        <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-10 space-y-8 px-4">
            <div>
                <h1 className="text-3xl font-bold">{quiz.title}</h1>
                <p className="text-gray-500 mt-2">{quiz.description}</p>
            </div>

            <div className="space-y-6">
                {quiz.questions.map((q, index) => (
                    <Card key={q.id}>
                        <CardHeader>
                            <CardTitle className="text-lg font-medium">
                                Question {index + 1}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-lg">
                                <MathRenderer text={q.text} />
                            </div>

                            {q.imageUrl && (
                                <img src={q.imageUrl} alt="Question" className="max-h-60 rounded border" />
                            )}

                            <RadioGroup
                                value={answers[q.id]}
                                onValueChange={(val) => handleOptionSelect(q.id, val)}
                                className="space-y-2"
                            >
                                {q.options.map((option) => (
                                    <div key={option.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <RadioGroupItem value={option.id} id={`${q.id}-${option.id}`} />
                                        <Label htmlFor={`${q.id}-${option.id}`} className="flex-grow cursor-pointer">
                                            {option.text}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end">
                <Button size="lg" onClick={handleSubmit} disabled={Object.keys(answers).length < quiz.questions.length}>
                    Submit Quiz
                </Button>
            </div>
        </div>
    );
}
