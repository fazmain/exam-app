"use client";

import { useState } from "react";
import { storage, auth } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/context/AuthContext";

export default function TestUploadPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState("Idle");
    const [url, setUrl] = useState("");

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus("Uploading...");
        try {
            if (!user) throw new Error("User not logged in");

            const storageRef = ref(storage, `test-uploads/${user.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            setUrl(downloadUrl);
            setStatus("Success!");
        } catch (error: any) {
            console.error("Upload failed:", error);
            setStatus(`Error: ${error.message || error.code}`);
        }
    };

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">Test Image Upload</h1>
            <p className="mb-4">User: {user ? user.email : "Not logged in"}</p>

            <input type="file" onChange={handleUpload} className="mb-4" />

            <div className="mt-4">
                <p>Status: <strong>{status}</strong></p>
                {url && (
                    <div className="mt-4">
                        <p>Uploaded URL:</p>
                        <a href={url} target="_blank" rel="noreferrer" className="text-blue-500 underline">{url}</a>
                        <img src={url} alt="Uploaded" className="mt-2 max-w-xs border" />
                    </div>
                )}
            </div>
        </div>
    );
}
