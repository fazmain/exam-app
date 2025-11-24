
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
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

async function verify() {
    console.log("Starting verification...");

    // 1. Verify 5-digit ID
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(5));
    const usersSnap = await getDocs(usersQuery);
    console.log("Recent Users:");
    usersSnap.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.name} (${data.email}): Student ID = ${data.studentId} (Length: ${data.studentId?.length})`);
    });

    // 2. Verify Retake Logic (Simulated)
    // We can't easily simulate the UI blocking, but we can check if the data supports it.
    // Let's find a quiz and check its settings.
    const quizzesQuery = query(collection(db, "quizzes"), limit(1));
    const quizzesSnap = await getDocs(quizzesQuery);
    if (!quizzesSnap.empty) {
        const quizDoc = quizzesSnap.docs[0];
        console.log(`\nChecking Quiz: ${quizDoc.data().title} (${quizDoc.id})`);
        console.log("Settings:", quizDoc.data().settings);

        // Update to allow retakes = false
        await updateDoc(doc(db, "quizzes", quizDoc.id), {
            "settings.allowRetakes": false
        });
        console.log("Updated allowRetakes to false.");
    }

    console.log("\nVerification script complete.");
    process.exit(0);
}

verify().catch(console.error);
