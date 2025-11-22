"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Attempt {
    id: string;
    studentEmail: string;
    score: number;
    totalQuestions: number;
    completedAt: any;
}

interface Quiz {
    id: string;
    title: string;
    description: string;
}

export default function QuizAnalyticsPage() {
    const { id } = useParams();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                // Fetch Quiz
                const quizDoc = await getDoc(doc(db, "quizzes", id as string));
                if (quizDoc.exists()) {
                    setQuiz({ id: quizDoc.id, ...quizDoc.data() } as Quiz);
                }

                // Fetch Attempts (removed orderBy to avoid index requirement)
                const q = query(
                    collection(db, "attempts"),
                    where("quizId", "==", id)
                );
                const querySnapshot = await getDocs(q);
                const attemptsData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Attempt[];

                // Sort in memory instead of in query
                attemptsData.sort((a, b) => {
                    const aTime = a.completedAt?.toMillis() || 0;
                    const bTime = b.completedAt?.toMillis() || 0;
                    return bTime - aTime; // Descending order
                });

                setAttempts(attemptsData);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleCopyLink = () => {
        const quizLink = `${window.location.origin}/quiz/${id}`;
        navigator.clipboard.writeText(quizLink);
        setCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return <div>Loading analytics...</div>;
    }

    if (!quiz) {
        return <div>Quiz not found</div>;
    }

    const averageScore = attempts.length > 0
        ? (attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length).toFixed(1)
        : 0;

    const quizLink = typeof window !== 'undefined' ? `${window.location.origin}/quiz/${id}` : '';

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">{quiz.title}</h1>
                <p className="text-gray-500">Analytics & Performance</p>
            </div>

            {/* Share Link Card */}
            <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardHeader>
                    <CardTitle className="text-lg">Share Quiz Link</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            value={quizLink}
                            readOnly
                            className="font-mono text-sm"
                        />
                        <Button onClick={handleCopyLink} variant="default">
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        Share this link with your students to let them take the quiz.
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{attempts.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{averageScore}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Attempts</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attempts.map((attempt) => (
                                <TableRow key={attempt.id}>
                                    <TableCell>{attempt.studentEmail}</TableCell>
                                    <TableCell>{attempt.score} / {attempt.totalQuestions}</TableCell>
                                    <TableCell>{attempt.completedAt?.toDate().toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                            {attempts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-gray-500">
                                        No attempts yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
