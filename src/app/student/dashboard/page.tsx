"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
    quizId: string;
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
    const [displayName, setDisplayName] = useState("");
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || "");
        }
    }, [user]);

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



    const handleUpdateProfile = async () => {
        if (!user) return;
        try {
            await updateProfile(user, { displayName });
            toast.success("Profile updated successfully!");
            setIsEditingProfile(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile.");
        }
    };

    if (authLoading || loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto py-10 space-y-8 px-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Student Dashboard</h1>
                    <p className="text-gray-500 mt-2">View your past quiz attempts and scores.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>My Profile</CardTitle>
                        <CardDescription>Manage your account details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={user?.email || ""} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Display Name</Label>
                            <Input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                disabled={!isEditingProfile}
                                placeholder="Enter your name"
                            />
                        </div>
                        {isEditingProfile ? (
                            <div className="flex gap-2">
                                <Button onClick={handleUpdateProfile} size="sm" className="flex-1">Save</Button>
                                <Button variant="outline" onClick={() => setIsEditingProfile(false)} size="sm" className="flex-1">Cancel</Button>
                            </div>
                        ) : (
                            <Button variant="outline" onClick={() => setIsEditingProfile(true)} className="w-full">Edit Profile</Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-3">
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
                                                <Button variant="default" size="sm" className="ml-2" onClick={() => router.push(`/quiz/${attempt.quizId}`)}>
                                                    Retake
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
        </div>
    );
}
