import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function seed() {
    try {
        // Login to get a user ID (or just use a placeholder if rules allow, but better to be real)
        // We'll assume the user from previous steps exists: test@test.com / password
        // If not, we might fail. Let's try to sign in.
        let userId = "test-user-id";
        try {
            const userCredential = await signInWithEmailAndPassword(auth, "test@test.com", "password");
            userId = userCredential.user.uid;
            console.log("Logged in as:", userId);
        } catch (e) {
            console.log("Login failed, using placeholder ID. Might fail if rules require auth.");
        }

        // Create a Quiz
        const quizRef = await addDoc(collection(db, "quizzes"), {
            instructorId: userId,
            title: "Seeded Advanced Quiz",
            description: "Testing timer, negative marking, randomization via seed",
            questions: [
                {
                    id: "q1",
                    text: "What is **2+2**?",
                    options: [
                        { id: "o1", text: "3", isCorrect: false },
                        { id: "o2", text: "4", isCorrect: true },
                    ],
                    randomizeOptions: true
                },
                {
                    id: "q2",
                    text: "Solve $\\sqrt{9}$",
                    options: [
                        { id: "o3", text: "3", isCorrect: true },
                        { id: "o4", text: "9", isCorrect: false },
                    ],
                    randomizeOptions: false
                }
            ],
            settings: {
                gradingSystem: true,
                timer: 5, // 5 minutes
                negativeMarking: true,
                randomizeQuestions: true,
                pointsPerQuestion: 2,
                negativeMarkingPoints: 0.5,
            },
            createdAt: Timestamp.now(),
        });
        console.log("Quiz created with ID:", quizRef.id);

        // Create an Attempt
        await addDoc(collection(db, "attempts"), {
            quizId: quizRef.id,
            quizTitle: "Seeded Advanced Quiz",
            studentId: userId,
            studentEmail: "test@test.com",
            answers: { "q1": "o2", "q2": "o4" }, // 1 correct, 1 wrong
            score: 0, // 1 - 1 = 0 (negative marking)
            totalQuestions: 2,
            completedAt: Timestamp.now(),
            settings: {
                gradingSystem: true,
                negativeMarking: true,
            }
        });
        console.log("Attempt created for user:", userId);

        console.log("Seeding complete!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding:", error);
        process.exit(1);
    }
}

seed();
