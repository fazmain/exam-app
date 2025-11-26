"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { sendEmailVerification } from "firebase/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

export default function VerifyEmailPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (user?.emailVerified) {
            router.push("/dashboard");
        }
    }, [user, router]);

    const handleResend = async () => {
        if (!user) return;
        setSending(true);
        try {
            await sendEmailVerification(user);
            toast.success("Verification email sent!");
        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/too-many-requests') {
                toast.error("Too many requests. Please wait a bit.");
            } else {
                toast.error("Failed to send email.");
            }
        } finally {
            setSending(false);
        }
    };

    const handleCheckVerification = async () => {
        if (!user) return;
        try {
            await user.reload();
            if (user.emailVerified) {
                toast.success("Email verified!");
                router.push("/dashboard");
            } else {
                toast.info("Email not verified yet. Please check your inbox.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error checking verification status.");
        }
    };

    if (!user) {
        return <div className="flex h-screen items-center justify-center">Please log in first.</div>;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
                        <Mail className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Verify your email</CardTitle>
                    <CardDescription>
                        We sent a verification link to <strong>{user.email}</strong>.
                        Please check your inbox and click the link to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button className="w-full" onClick={handleCheckVerification}>
                        I've Verified My Email
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleResend} disabled={sending}>
                        {sending ? "Sending..." : "Resend Verification Email"}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-4">
                        Can't find it? Check your spam folder.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
