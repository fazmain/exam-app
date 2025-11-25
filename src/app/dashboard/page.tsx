"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { PlusCircle, Edit } from "lucide-react";

interface Quiz {
    id: string;
    title: string;
    description: string;
    createdAt: any;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuizzes = async () => {
            if (!user) return;
            try {
                const q = query(collection(db, "quizzes"), where("instructorId", "==", user.uid));
                const querySnapshot = await getDocs(q);
                const quizzesData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Quiz[];
                setQuizzes(quizzesData);
            } catch (error) {
                console.error("Error fetching quizzes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, [user]);

    if (loading) {
        return <div>Loading quizzes...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">My Quizzes</h2>
                    <p className="text-muted-foreground">Welcome, {user?.email}</p>
                </div>
                <Link href="/dashboard/create-quiz">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Quiz
                    </Button>
                </Link>
            </div>

            {quizzes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No quizzes created yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first quiz.</p>
                    <div className="mt-6">
                        <Link href="/dashboard/create-quiz">
                            <Button>Create Quiz</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map((quiz) => (
                        <Card key={quiz.id}>
                            <CardHeader>
                                <CardTitle>{quiz.title}</CardTitle>
                                <CardDescription>{quiz.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col gap-3">
                                    <span className="text-sm text-gray-500">
                                        Created: {quiz.createdAt?.toDate().toLocaleDateString()}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => {
                                                const link = `${window.location.origin}/quiz/${quiz.id}`;
                                                navigator.clipboard.writeText(link);
                                                // toast.success("Link copied to clipboard!");
                                                alert("Link copied to clipboard!");
                                            }}
                                        >
                                            Copy Link
                                        </Button>
                                        <Link href={`/dashboard/edit-quiz/${quiz.id}`} className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full">
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                        </Link>
                                        <Link href={`/dashboard/quiz/${quiz.id}`} className="flex-1">
                                            <Button variant="default" size="sm" className="w-full">
                                                View Details
                                            </Button>
                                        </Link>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full"
                                        onClick={async () => {
                                            if (confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
                                                try {
                                                    await deleteDoc(doc(db, "quizzes", quiz.id));
                                                    setQuizzes(quizzes.filter(q => q.id !== quiz.id));
                                                    // toast.success("Quiz deleted successfully"); // Assuming toast is available or added
                                                } catch (error) {
                                                    console.error("Error deleting quiz:", error);
                                                    alert("Failed to delete quiz");
                                                }
                                            }
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
