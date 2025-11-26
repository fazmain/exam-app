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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Trash2, Image as ImageIcon, Bold, Italic, Underline, Info, Shuffle, X } from "lucide-react";
import { Question, QuizSettings, Option } from "@/lib/types";
import { MathPreview } from "@/components/MathPreview";

export default function EditQuizPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [settings, setSettings] = useState<QuizSettings>({
        gradingSystem: true,
        timer: 30,
        negativeMarking: false,
        randomizeQuestions: false,
        pointsPerQuestion: 1,
        negativeMarkingPoints: 0.25,
        lockedAnswers: false,
        isActive: true,
        allowRetakes: false,
    });
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
                    setQuestions(data.questions || []);
                    if (data.settings) {
                        setSettings({ ...settings, ...data.settings });
                    }
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
                    { id: "3", text: "", isCorrect: false },
                    { id: "4", text: "", isCorrect: false },
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

    const toggleQuestionRandomization = (id: string) => {
        setQuestions(questions.map((q) => (q.id === id ? { ...q, randomizeOptions: !q.randomizeOptions } : q)));
    };

    const insertText = (id: string, prefix: string, suffix: string) => {
        const question = questions.find((q) => q.id === id);
        if (!question) return;

        const newText = question.text + `${prefix}text${suffix}`;
        updateQuestionText(id, newText);
    };

    const updateQuestionDescription = (id: string, description: string) => {
        setQuestions(questions.map((q) => (q.id === id ? { ...q, description } : q)));
    };

    const handleImageUpload = async (questionId: string, file: File, optionId?: string) => {
        if (!file) return;
        const uploadId = optionId ? `${questionId}-${optionId}` : questionId;
        setUploadingImage(uploadId);
        try {
            const storageRef = ref(storage, `quiz-images/${user?.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            if (optionId) {
                setQuestions(questions.map((q) =>
                    q.id === questionId
                        ? { ...q, options: q.options.map(o => o.id === optionId ? { ...o, imageUrl: url } : o) }
                        : q
                ));
            } else {
                setQuestions(questions.map((q) => (q.id === questionId ? { ...q, imageUrl: url } : q)));
            }
            toast.success("Image uploaded!");
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image.");
        } finally {
            setUploadingImage(null);
        }
    };

    const removeImage = (questionId: string, optionId?: string) => {
        if (optionId) {
            setQuestions(questions.map((q) =>
                q.id === questionId
                    ? { ...q, options: q.options.map(o => o.id === optionId ? { ...o, imageUrl: undefined } : o) }
                    : q
            ));
        } else {
            setQuestions(questions.map((q) => (q.id === questionId ? { ...q, imageUrl: undefined } : q)));
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
            // Sanitize questions to remove undefined values
            const sanitizedQuestions = questions.map(q => {
                const { ...rest } = q;
                // Ensure no undefined values in options
                const sanitizedOptions = q.options.map(o => {
                    const { ...oRest } = o;
                    const newO: any = { ...oRest };
                    if (newO.imageUrl === undefined) delete newO.imageUrl;
                    return newO;
                });

                const newQ: any = { ...rest, options: sanitizedOptions };
                if (newQ.imageUrl === undefined) delete newQ.imageUrl;
                if (newQ.description === undefined) delete newQ.description;
                return newQ;
            });

            await updateDoc(doc(db, "quizzes", id as string), {
                title,
                description,
                questions: sanitizedQuestions,
                settings,
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
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold">Edit Quiz</h1>
                <p className="text-gray-500">Update questions, options, and settings.</p>
            </div>

            <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Quiz Details</TabsTrigger>
                    <TabsTrigger value="questions">Questions</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="questions" className="space-y-6 mt-4">
                    {questions.map((q, index) => (
                        <Card key={q.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-medium">Question {index + 1}</CardTitle>
                                <div className="flex items-center gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center gap-2 mr-2">
                                                    <Label htmlFor={`randomize-${q.id}`} className="text-xs cursor-pointer">Randomize Options</Label>
                                                    <Switch
                                                        id={`randomize-${q.id}`}
                                                        checked={q.randomizeOptions}
                                                        onCheckedChange={() => toggleQuestionRandomization(q.id)}
                                                    />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Shuffle options for this question</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Question Text (Markdown & LaTeX supported)</Label>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => insertText(q.id, "**", "**")} title="Bold">
                                                <Bold className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => insertText(q.id, "*", "*")} title="Italic">
                                                <Italic className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => insertText(q.id, "<u>", "</u>")} title="Underline">
                                                <Underline className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Textarea
                                        value={q.text}
                                        onChange={(e) => updateQuestionText(q.id, e.target.value)}
                                        placeholder="Enter question text... Use $ for math."
                                        className="min-h-[100px]"
                                    />
                                    {q.text && (
                                        <div className="text-sm text-gray-600 mt-1 p-4 bg-gray-50 dark:bg-gray-900 rounded border">
                                            <div className="font-semibold text-xs text-gray-400 mb-2">PREVIEW</div>
                                            <MathPreview text={q.text} />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Description / Explanation (shown after quiz)</Label>
                                    <Textarea
                                        value={q.description || ""}
                                        onChange={(e) => updateQuestionDescription(q.id, e.target.value)}
                                        placeholder="Explain the answer..."
                                    />
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
                                        <div className="relative inline-block mt-2">
                                            <img src={q.imageUrl} alt="Question Image" className="max-h-40 rounded border" />
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                                onClick={() => removeImage(q.id)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <Label>Options</Label>
                                    {q.options.map((option, oIndex) => (
                                        <div
                                            key={option.id}
                                            className={`flex flex-col gap-2 p-3 border rounded-md transition-colors ${option.isCorrect
                                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                                : "border-gray-200 dark:border-gray-800"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={option.isCorrect}
                                                    onChange={() => toggleCorrectOption(q.id, option.id)}
                                                    className="h-5 w-5 accent-green-600 cursor-pointer"
                                                />
                                                <Input
                                                    value={option.text}
                                                    onChange={(e) => updateOptionText(q.id, option.id, e.target.value)}
                                                    placeholder={`Option ${oIndex + 1} (supports LaTeX)`}
                                                    className="flex-grow"
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => removeOption(q.id, option.id)}>
                                                    <Trash2 className="h-4 w-4 text-gray-400" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center gap-2 ml-6">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    className="w-auto text-xs"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleImageUpload(q.id, file, option.id);
                                                    }}
                                                    disabled={uploadingImage === `${q.id}-${option.id}`}
                                                />
                                                {uploadingImage === `${q.id}-${option.id}` && <span className="text-xs">Uploading...</span>}
                                            </div>

                                            {(option.text || option.imageUrl) && (
                                                <div className="ml-6 p-2 bg-gray-50 dark:bg-gray-800 rounded border flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">Preview: </span>
                                                    {option.imageUrl && (
                                                        <div className="relative">
                                                            <img src={option.imageUrl} alt="Option" className="h-8 rounded" />
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                className="absolute -top-2 -right-2 h-4 w-4 rounded-full"
                                                                onClick={() => removeImage(q.id, option.id)}
                                                            >
                                                                <X className="h-2 w-2" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    <MathPreview text={option.text} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={() => addOption(q.id)} className="mt-2">
                                        <Plus className="mr-2 h-4 w-4" /> Add Option
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Button variant="outline" onClick={addQuestion} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Add Question
                    </Button>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quiz Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Grading System</Label>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                        Enable scoring for this quiz
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger><Info className="h-4 w-4" /></TooltipTrigger>
                                                <TooltipContent>
                                                    <p>If disabled, the quiz will be for practice only.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.gradingSystem}
                                    onCheckedChange={(checked) => setSettings({
                                        ...settings,
                                        gradingSystem: checked,
                                        negativeMarking: checked ? settings.negativeMarking : false
                                    })}
                                />
                            </div>

                            {settings.gradingSystem && (
                                <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-800">
                                    <Label className="text-base">Points per Question</Label>
                                    <Input
                                        type="number"
                                        min="0.5"
                                        step="0.5"
                                        value={settings.pointsPerQuestion}
                                        onChange={(e) => setSettings({ ...settings, pointsPerQuestion: parseFloat(e.target.value) || 0 })}
                                        className="max-w-[200px]"
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className={`text-base ${!settings.gradingSystem ? "text-gray-400" : ""}`}>Negative Marking</Label>
                                    <div className={`text-sm flex items-center gap-2 ${!settings.gradingSystem ? "text-gray-300" : "text-gray-500"}`}>
                                        Deduct points for wrong answers
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger><Info className="h-4 w-4" /></TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Points will be deducted for each incorrect answer.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.negativeMarking}
                                    disabled={!settings.gradingSystem}
                                    onCheckedChange={(checked) => setSettings({ ...settings, negativeMarking: checked })}
                                />
                            </div>

                            {settings.negativeMarking && (
                                <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-800">
                                    <Label className="text-base">Points to Deduct</Label>
                                    <Input
                                        type="number"
                                        min="0.1"
                                        step="0.1"
                                        value={settings.negativeMarkingPoints}
                                        onChange={(e) => setSettings({ ...settings, negativeMarkingPoints: parseFloat(e.target.value) || 0 })}
                                        className="max-w-[200px]"
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Randomize Questions</Label>
                                    <div className="text-sm text-gray-500">
                                        Shuffle question order for each student
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.randomizeQuestions}
                                    onCheckedChange={(checked) => setSettings({ ...settings, randomizeQuestions: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Active (Accepting Responses)</Label>
                                    <div className="text-sm text-gray-500">
                                        If disabled, students cannot start the quiz
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.isActive}
                                    onCheckedChange={(checked) => setSettings({ ...settings, isActive: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Locked Answers</Label>
                                    <div className="text-sm text-gray-500">
                                        Prevent changing answers once selected
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.lockedAnswers}
                                    onCheckedChange={(checked) => setSettings({ ...settings, lockedAnswers: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Allow Retakes</Label>
                                    <div className="text-sm text-gray-500">
                                        Allow students to take the quiz multiple times
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.allowRetakes ?? false}
                                    onCheckedChange={(checked) => setSettings({ ...settings, allowRetakes: checked })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-base">Timer (minutes)</Label>
                                <div className="text-sm text-gray-500 mb-2">
                                    Set to 0 for no time limit
                                </div>
                                <Input
                                    type="number"
                                    min="0"
                                    value={settings.timer}
                                    onChange={(e) => setSettings({ ...settings, timer: parseInt(e.target.value) || 0 })}
                                    className="max-w-[200px]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-6">
                <Button size="lg" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Updating..." : "Update Quiz"}
                </Button>
            </div>
        </div>
    );
}
