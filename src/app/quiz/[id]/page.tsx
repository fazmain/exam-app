import { Metadata } from "next";
import QuizClient from "./QuizClient";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
    { params }: Props,
): Promise<Metadata> {
    const { id } = await params;

    try {
        const docRef = doc(db, "quizzes", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                title: data.title,
                description: data.description || "Take this quiz on Paperless",
                openGraph: {
                    title: data.title,
                    description: data.description || "Take this quiz on Paperless",
                }
            };
        }
    } catch (error) {
        console.error("Error fetching quiz metadata:", error);
    }

    return {
        title: "Quiz | Paperless",
    };
}

export default function QuizPage() {
    return <QuizClient />;
}
