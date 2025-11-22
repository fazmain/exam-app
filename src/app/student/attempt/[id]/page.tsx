"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Quiz, Question } from "@/lib/types";
import { QuizResults } from "@/components/QuizResults";
import { toast } from "sonner";

export default function AttemptReviewPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [attempt, setAttempt] = useState<any>(null);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!id || !user) return;

            try {
                // Fetch Attempt
                const attemptRef = doc(db, "attempts", id as string);
                const attemptSnap = await getDoc(attemptRef);

                if (!attemptSnap.exists()) {
                    toast.error("Attempt not found");
                    router.push("/student/dashboard");
                    return;
                }

                const attemptData = attemptSnap.data();
                if (attemptData.studentId !== user.uid) {
                    toast.error("Unauthorized");
                    router.push("/student/dashboard");
                    return;
                }

                setAttempt(attemptData);

                // Fetch Quiz
                const quizRef = doc(db, "quizzes", attemptData.quizId);
                const quizSnap = await getDoc(quizRef);

                if (quizSnap.exists()) {
                    const quizData = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
                    setQuiz(quizData);

                    // We need to reconstruct the questions as they were presented if possible, 
                    // but for now we'll show the current state of questions. 
                    // Ideally, we should snapshot questions in the attempt, but that's a larger schema change.
                    // We will use the quiz questions.
                    // Note: Randomization might mean the order is different from what the student saw 
                    // unless we stored the question order in the attempt. 
                    // For this iteration, we'll just show the questions in default order.
                    setQuestions(quizData.questions);
                } else {
                    toast.error("Quiz data not found");
                }

            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Error loading review");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, user, router]);

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
    if (!attempt || !quiz) return <div className="flex h-screen items-center justify-center">Data not found</div>;

    return (
        <QuizResults
            quizTitle={quiz.title}
            score={attempt.score}
            questions={questions}
            answers={attempt.answers}
            onBack={() => router.push("/student/dashboard")}
        />
    );
}
