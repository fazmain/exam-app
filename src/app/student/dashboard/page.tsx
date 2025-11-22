"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Attempt {
    id: string;
    quizTitle: string;
    score: number;
    totalQuestions: number;
    completedAt: any;
}

export default function StudentDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
            return;
        }

        const fetchAttempts = async () => {
            if (!user) return;
            try {
                const q = query(
                    collection(db, "attempts"),
                    where("studentId", "==", user.uid),
                    orderBy("completedAt", "desc")
                );
                const querySnapshot = await getDocs(q);
                const attemptsData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Attempt[];
                setAttempts(attemptsData);
            } catch (error) {
                console.error("Error fetching attempts:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchAttempts();
        }
    }, [user, authLoading, router]);

    if (authLoading || loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-10 space-y-8 px-4">
            <div>
                <h1 className="text-3xl font-bold">Student Dashboard</h1>
                <p className="text-gray-500 mt-2">View your past quiz attempts and scores.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>My Attempts</CardTitle>
                </CardHeader>
                <CardContent>
                    {attempts.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No attempts found. Take a quiz to get started!</p>
                    ) : (
                        <Table>
                            <TableCaption>A list of your recent quiz attempts.</TableCaption>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Quiz Title</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Percentage</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attempts.map((attempt) => (
                                    <TableRow key={attempt.id}>
                                        <TableCell className="font-medium">{attempt.quizTitle || "Untitled Quiz"}</TableCell>
                                        <TableCell>{attempt.score} / {attempt.totalQuestions}</TableCell>
                                        <TableCell>
                                            {attempt.completedAt?.seconds
                                                ? format(new Date(attempt.completedAt.seconds * 1000), "PPP p")
                                                : "N/A"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Math.round((attempt.score / attempt.totalQuestions) * 100)}%
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => router.push(`/student/attempt/${attempt.id}`)}>
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
