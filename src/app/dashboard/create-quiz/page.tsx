"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
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

export default function CreateQuizPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState<Question[]>([
        {
            id: Date.now().toString(),
            text: "",
            options: [
                { id: "1", text: "", isCorrect: false },
                { id: "2", text: "", isCorrect: false },
            ],
        },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState<string | null>(null);

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
            await addDoc(collection(db, "quizzes"), {
                instructorId: user?.uid,
                title,
                description,
                questions,
                createdAt: Timestamp.now(),
            });
            toast.success("Quiz created successfully!");
            router.push("/dashboard");
        } catch (error) {
            console.error("Error creating quiz:", error);
            toast.error("Failed to create quiz.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold">Create New Quiz</h1>
                <p className="text-gray-500">Add questions, options, and set correct answers. Supports LaTeX for math (e.g. <code>\sqrt{"{x}"}</code>).</p>
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
                        placeholder="Brief description of the quiz..."
                    />
                </div>
            </div>

            <div className="space-y-6">
                {questions.map((q, index) => (
                    <Card key={q.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">Question {index + 1}</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Question Text (LaTeX supported)</Label>
                                <Input
                                    value={q.text}
                                    onChange={(e) => updateQuestionText(q.id, e.target.value)}
                                    placeholder="Enter question text..."
                                />
                                {q.text && (
                                    <div className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                                        Preview: <MathPreview text={q.text} />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Image (Optional)</Label>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                handleImageUpload(q.id, e.target.files[0]);
                                            }
                                        }}
                                        disabled={uploadingImage === q.id}
                                    />
                                    {uploadingImage === q.id && <span className="text-sm text-blue-500">Uploading...</span>}
                                </div>
                                {q.imageUrl && (
                                    <div className="mt-2">
                                        <img src={q.imageUrl} alt="Question Image" className="max-h-40 rounded border" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Options</Label>
                                {q.options.map((option) => (
                                    <div key={option.id} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={option.isCorrect}
                                            onChange={() => toggleCorrectOption(q.id, option.id)}
                                            className="h-4 w-4"
                                        />
                                        <Input
                                            value={option.text}
                                            onChange={(e) => updateOptionText(q.id, option.id, e.target.value)}
                                            placeholder={`Option text`}
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeOption(q.id, option.id)}>
                                            <Trash2 className="h-4 w-4 text-gray-400" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={() => addOption(q.id)} className="mt-2">
                                    <Plus className="mr-2 h-4 w-4" /> Add Option
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-between">
                <Button variant="outline" onClick={addQuestion}>
                    <Plus className="mr-2 h-4 w-4" /> Add Question
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Saving..." : "Save Quiz"}
                </Button>
            </div>
        </div>
    );
}
