"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, KeyRound } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function AuthActionContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    const [status, setStatus] = useState<"loading" | "success" | "error" | "reset-form">("loading");
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState(""); // For password reset display
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!oobCode) {
            setStatus("error");
            setMessage("Invalid or missing verification code.");
            return;
        }

        const handleAction = async () => {
            try {
                if (mode === "verifyEmail") {
                    await applyActionCode(auth, oobCode);
                    setStatus("success");
                    setMessage("Your email has been verified successfully.");
                } else if (mode === "resetPassword") {
                    const email = await verifyPasswordResetCode(auth, oobCode);
                    setEmail(email);
                    setStatus("reset-form");
                } else {
                    setStatus("error");
                    setMessage("Unknown action mode.");
                }
            } catch (error: any) {
                console.error("Auth action error:", error);
                setStatus("error");
                setMessage(error.message || "The link is invalid or has expired.");
            }
        };

        handleAction();
    }, [mode, oobCode]);

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oobCode) return;

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsSubmitting(true);
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setStatus("success");
            setMessage("Your password has been reset successfully.");
        } catch (error: any) {
            console.error(error);
            setStatus("error");
            setMessage(error.message || "Failed to reset password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4">
                        {status === "loading" && (
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        )}
                        {status === "success" && (
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                        )}
                        {status === "error" && (
                            <XCircle className="h-12 w-12 text-red-500" />
                        )}
                        {status === "reset-form" && (
                            <KeyRound className="h-12 w-12 text-primary" />
                        )}
                    </div>
                    <CardTitle className="text-2xl">
                        {status === "loading" && "Processing..."}
                        {status === "success" && (mode === "resetPassword" ? "Password Reset" : "Email Verified")}
                        {status === "error" && "Action Failed"}
                        {status === "reset-form" && "Reset Password"}
                    </CardTitle>
                    <CardDescription>
                        {status === "loading" && "Please wait..."}
                        {status === "success" && message}
                        {status === "error" && message}
                        {status === "reset-form" && `Enter a new password for ${email}`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status === "reset-form" && (
                        <form onSubmit={handlePasswordReset} className="space-y-4 text-left">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Resetting..." : "Reset Password"}
                            </Button>
                        </form>
                    )}

                    {status === "success" && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                You can now sign in with your account.
                            </p>
                            <Link href="/login">
                                <Button className="w-full h-12 text-lg">
                                    Go to Login
                                </Button>
                            </Link>
                        </div>
                    )}

                    {status === "error" && (
                        <Link href="/login">
                            <Button variant="outline" className="w-full">
                                Back to Login
                            </Button>
                        </Link>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function AuthActionPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <AuthActionContent />
        </Suspense>
    );
}
