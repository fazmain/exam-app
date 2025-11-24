"use client";

import { useEffect, useState } from "react";
import { Quiz, Question } from "@/lib/types";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import katex from "katex";
import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";

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

interface QuizResultsProps {
    quizId?: string;
    quizTitle: string;
    score: number;
    questions: Question[];
    answers: { [key: string]: string };
    onBack?: () => void;
}

export function QuizResults({ quizId, quizTitle, score, questions, answers, onBack }: QuizResultsProps) {
    const router = useRouter();
    const [stats, setStats] = useState<{ [questionId: string]: { [optionId: string]: number } }>({});
    const [totalAttempts, setTotalAttempts] = useState(0);

    useEffect(() => {
        const fetchStats = async () => {
            if (!quizId) return;
            try {
                const q = query(collection(db, "attempts"), where("quizId", "==", quizId));
                const querySnapshot = await getDocs(q);

                const newStats: { [questionId: string]: { [optionId: string]: number } } = {};
                const attemptsCount = querySnapshot.size;
                setTotalAttempts(attemptsCount);

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const attemptAnswers = data.answers as { [key: string]: string };

                    Object.entries(attemptAnswers).forEach(([qId, optionId]) => {
                        if (!newStats[qId]) newStats[qId] = {};
                        newStats[qId][optionId] = (newStats[qId][optionId] || 0) + 1;
                    });
                });

                setStats(newStats);
            } catch (error) {
                console.error("Error fetching stats:", error);
            }
        };

        fetchStats();
    }, [quizId]);

    const renderQuestions = (filter: "all" | "correct" | "incorrect" | "skipped") => {
        const filteredQuestions = questions.filter((q) => {
            const selectedOptionId = answers[q.id];
            const correctOption = q.options.find((o) => o.isCorrect);
            const isCorrect = selectedOptionId === correctOption?.id;
            const isSkipped = !selectedOptionId;

            if (filter === "all") return true;
            if (filter === "correct") return isCorrect;
            if (filter === "incorrect") return !isCorrect && !isSkipped;
            if (filter === "skipped") return isSkipped;
            return true;
        });

        if (filteredQuestions.length === 0) {
            return <div className="text-center py-8 text-gray-500">No questions in this category.</div>;
        }

        return (
            <div className="space-y-6">
                {filteredQuestions.map((q, index) => {
                    const selectedOptionId = answers[q.id];
                    const correctOption = q.options.find((o) => o.isCorrect);
                    const isCorrect = selectedOptionId === correctOption?.id;
                    const isSkipped = !selectedOptionId;

                    return (
                        <Card key={q.id} className={`border-l-4 ${isCorrect ? 'border-l-green-500' : isSkipped ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                    {isCorrect ? (
                                        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-1" />
                                    ) : isSkipped ? (
                                        <AlertTriangle className="h-6 w-6 text-yellow-500 shrink-0 mt-1" />
                                    ) : (
                                        <XCircle className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                                    )}
                                    <div className="space-y-4 w-full">
                                        <div className="font-medium text-lg">
                                            <span className="text-gray-500 mr-2">Q.</span>
                                            <MathPreview text={q.text} />
                                        </div>
                                        {q.imageUrl && (
                                            <img src={q.imageUrl} alt="Question" className="max-h-60 rounded-lg border" />
                                        )}

                                        <div className="space-y-2">
                                            {q.options.map(option => {
                                                const isSelected = option.id === selectedOptionId;
                                                const isOptionCorrect = option.isCorrect;
                                                const statCount = stats[q.id]?.[option.id] || 0;
                                                const percentage = totalAttempts > 0 ? Math.round((statCount / totalAttempts) * 100) : 0;

                                                let optionClass = "p-3 rounded-lg border flex flex-col gap-1 ";
                                                if (isOptionCorrect) {
                                                    optionClass += "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900";
                                                } else if (isSelected && !isOptionCorrect) {
                                                    optionClass += "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900";
                                                } else {
                                                    optionClass += "bg-card border-border";
                                                }

                                                return (
                                                    <div key={option.id} className={optionClass}>
                                                        <div className="flex justify-between items-center w-full">
                                                            <div className="flex items-center gap-2">
                                                                <MathPreview text={option.text} />
                                                                {option.imageUrl && (
                                                                    <img src={option.imageUrl} alt="Option" className="h-8 rounded border" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                {isOptionCorrect && <span className="text-xs font-semibold text-green-600 dark:text-green-400">Correct Answer</span>}
                                                                {isSelected && !isOptionCorrect && <span className="text-xs font-semibold text-red-600 dark:text-red-400">Your Answer</span>}
                                                            </div>
                                                        </div>
                                                        {totalAttempts > 0 && (
                                                            <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 mt-1">
                                                                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                            </div>
                                                        )}
                                                        {totalAttempts > 0 && (
                                                            <span className="text-xs text-gray-500">{percentage}% of students chose this</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {q.description && (
                                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                                <h4 className="font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-1">
                                                    <Info className="h-4 w-4" /> Explanation
                                                </h4>
                                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                                    <MathPreview text={q.description} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="max-w-3xl mx-auto py-10 space-y-8 px-4">
            <Card>
                <CardHeader>
                    <CardTitle>Quiz Results: {quizTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center py-8">
                        <h2 className="text-4xl font-bold text-primary">{score}</h2>
                        <p className="text-gray-500 mt-2">Your Score</p>
                    </div>

                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="correct">Correct</TabsTrigger>
                            <TabsTrigger value="incorrect">Incorrect</TabsTrigger>
                            <TabsTrigger value="skipped">Skipped</TabsTrigger>
                        </TabsList>
                        <TabsContent value="all" className="mt-6">
                            {renderQuestions("all")}
                        </TabsContent>
                        <TabsContent value="correct" className="mt-6">
                            {renderQuestions("correct")}
                        </TabsContent>
                        <TabsContent value="incorrect" className="mt-6">
                            {renderQuestions("incorrect")}
                        </TabsContent>
                        <TabsContent value="skipped" className="mt-6">
                            {renderQuestions("skipped")}
                        </TabsContent>
                    </Tabs>

                    <Button onClick={onBack || (() => router.push("/student/dashboard"))} className="w-full mt-6">
                        Back to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
