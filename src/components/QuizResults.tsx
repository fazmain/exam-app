"use client";

import { Quiz, Question } from "@/lib/types";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
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
    quizTitle: string;
    score: number;
    questions: Question[];
    answers: { [key: string]: string };
    onBack?: () => void;
}

export function QuizResults({ quizTitle, score, questions, answers, onBack }: QuizResultsProps) {
    const router = useRouter();

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

                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">Detailed Breakdown</h3>
                        {questions.map((q, index) => {
                            const selectedOptionId = answers[q.id];
                            const correctOption = q.options.find(o => o.isCorrect);
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
                                            <div className="space-y-2 w-full">
                                                <div className="font-medium text-lg">
                                                    <span className="text-gray-500 mr-2">Q{index + 1}.</span>
                                                    <MathPreview text={q.text} />
                                                </div>
                                                <div className="space-y-2 mt-4">
                                                    {q.options.map(option => {
                                                        const isSelected = option.id === selectedOptionId;
                                                        const isOptionCorrect = option.isCorrect;

                                                        let optionClass = "p-3 rounded-lg border flex justify-between items-center ";
                                                        if (isOptionCorrect) {
                                                            optionClass += "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900";
                                                        } else if (isSelected && !isOptionCorrect) {
                                                            optionClass += "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900";
                                                        } else {
                                                            optionClass += "bg-card border-border";
                                                        }

                                                        return (
                                                            <div key={option.id} className={optionClass}>
                                                                <span>{option.text}</span>
                                                                {isOptionCorrect && <span className="text-xs font-semibold text-green-600 dark:text-green-400">Correct Answer</span>}
                                                                {isSelected && !isOptionCorrect && <span className="text-xs font-semibold text-red-600 dark:text-red-400">Your Answer</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <Button onClick={onBack || (() => router.push("/student/dashboard"))} className="w-full mt-6">
                        Back to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
