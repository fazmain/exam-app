"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
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

const MathPreview = ({ text }: { text: string }) => {
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

export default function EditQuizPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploadingImage, setUploadingImage] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "quizzes", id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTitle(data.title);
                    setDescription(data.description);
                    setQuestions(data.questions);
                } else {
                    toast.error("Quiz not found");
                    router.push("/dashboard");
                }
            } catch (error) {
                console.error("Error fetching quiz:", error);
                toast.error("Failed to load quiz");
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [id, router]);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                id: Date.now().toString(),
                text: "",
                options: [
                    { id: "1", text: "", isCorrect: false },
                    { id: "2", text: "", isCorrect: false },
                ],
            },
        ]);
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter((q) => q.id !== id));
    };

    const updateQuestionText = (id: string, text: string) => {
        setQuestions(questions.map((q) => (q.id === id ? { ...q, text } : q)));
    };

    const handleImageUpload = async (questionId: string, file: File) => {
        if (!file) return;
        setUploadingImage(questionId);
        try {
            const storageRef = ref(storage, `quiz-images/${user?.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setQuestions(questions.map((q) => (q.id === questionId ? { ...q, imageUrl: url } : q)));
            toast.success("Image uploaded!");
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image.");
        } finally {
            setUploadingImage(null);
        }
    };

    const addOption = (questionId: string) => {
        setQuestions(
            questions.map((q) =>
                q.id === questionId
                    ? {
                        ...q,
                        options: [
                            ...q.options,
                            { id: Date.now().toString(), text: "", isCorrect: false },
                        ],
                    }
                    : q
            )
        );
    };

    const updateOptionText = (questionId: string, optionId: string, text: string) => {
        setQuestions(
            questions.map((q) =>
                q.id === questionId
                    ? {
                        ...q,
                        options: q.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
                    }
                    : q
            )
        );
    };

    const toggleCorrectOption = (questionId: string, optionId: string) => {
        setQuestions(
            questions.map((q) =>
                q.id === questionId
                    ? {
                        ...q,
                        options: q.options.map((o) =>
                            o.id === optionId ? { ...o, isCorrect: !o.isCorrect } : o
                        ),
                    }
                    : q
            )
        );
    };

    const removeOption = (questionId: string, optionId: string) => {
        setQuestions(
            questions.map((q) =>
                q.id === questionId
                    ? {
                        ...q,
                        options: q.options.filter((o) => o.id !== optionId),
                    }
                    : q
            )
        );
    };

    const handleSubmit = async () => {
        if (!title || questions.length === 0) {
            toast.error("Please provide a title and at least one question.");
            return;
        }

        setSubmitting(true);
        try {
            await updateDoc(doc(db, "quizzes", id as string), {
                title,
                description,
                questions,
                updatedAt: Timestamp.now(),
            });
            toast.success("Quiz updated successfully!");
            router.push("/dashboard");
        } catch (error) {
            console.error("Error updating quiz:", error);
            toast.error("Failed to update quiz.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold">Edit Quiz</h1>
                <p className="text-gray-500">Update questions, options, and correct answers. Supports LaTeX for math (e.g. <code>\sqrt{"{x}"}</code>).</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Quiz Title</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Introduction to Physics"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of the quiz"
                    />
                </div>
            </div>

            <div className="space-y-6">
                {questions.map((question, qIndex) => (
                    <Card key={question.id}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Question {qIndex + 1}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeQuestion(question.id)}
                                    disabled={questions.length === 1}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Question Text (supports LaTeX)</Label>
                                <Textarea
                                    value={question.text}
                                    onChange={(e) => updateQuestionText(question.id, e.target.value)}
                                    placeholder="Enter question text, e.g. What is $x^2 + y^2$?"
                                />
                                {question.text && (
                                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                                        <span className="text-sm text-gray-500">Preview: </span>
                                        <MathPreview text={question.text} />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Image (optional)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(question.id, file);
                                        }}
                                        disabled={uploadingImage === question.id}
                                    />
                                    {uploadingImage === question.id && <span className="text-sm">Uploading...</span>}
                                </div>
                                {question.imageUrl && (
                                    <img src={question.imageUrl} alt="Question" className="max-h-40 rounded border" />
                                )}
                            </div>

                            <div className="space-y-3">
                                <Label>Options</Label>
                                {question.options.map((option, oIndex) => (
                                    <div key={option.id} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={option.isCorrect}
                                            onChange={() => toggleCorrectOption(question.id, option.id)}
                                            className="h-4 w-4"
                                        />
                                        <Input
                                            value={option.text}
                                            onChange={(e) => updateOptionText(question.id, option.id, e.target.value)}
                                            placeholder={`Option ${oIndex + 1}`}
                                            className="flex-grow"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeOption(question.id, option.id)}
                                            disabled={question.options.length <= 2}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addOption(question.id)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Option
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex gap-4">
                <Button onClick={addQuestion} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="ml-auto">
                    {submitting ? "Updating..." : "Update Quiz"}
                </Button>
            </div>
        </div>
    );
}
