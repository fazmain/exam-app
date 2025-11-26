"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { BookOpen, User, LogOut } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function Navbar() {
    const { user, role } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="Paperless Logo" className="h-8 w-8" />
                        <span className="text-xl font-bold">Paperless</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <ModeToggle />

                    {user ? (
                        <>
                            <div className="hidden md:flex items-center gap-2 mr-2">
                                <Link href="/dashboard">
                                    <Button variant="ghost" size="sm">Teacher Dashboard</Button>
                                </Link>
                                <Link href="/student/dashboard">
                                    <Button variant="ghost" size="sm">Student Dashboard</Button>
                                </Link>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                        <User className="h-5 w-5" />
                                        <span className="sr-only">User menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">Account</p>
                                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                                        Teacher Dashboard
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push('/student/dashboard')}>
                                        Student Dashboard
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/login">
                                <Button variant="ghost" size="sm">Login</Button>
                            </Link>
                            <Link href="/signup">
                                <Button size="sm">Get Started</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
