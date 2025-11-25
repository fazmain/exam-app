"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, BarChart3, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && role === "instructor") {
      router.push("/dashboard");
    }
  }, [user, role, loading, router]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              One click quiz creation
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
              The Quiz Platform for
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gray-500 to-gray-800 dark:from-gray-300 dark:to-gray-600">
                Independent Teachers
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg">
              Create, share, and grade quizzes with ease. No complex LMS required. Just you and your students.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8 w-full sm:w-auto">
                  Start Quizzing for Free
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-8 w-full sm:w-auto">
                  Instructor Login
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative">
            <img
              src="/landing-hero.svg"
              alt="Online Education Platform"
              className="relative h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* Student Section */}
      <section className="bg-muted/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold">Are you a Student?</h2>
            <p className="text-lg text-muted-foreground">
              Join your class, take quizzes, and track your progress. It's free and easy to get started.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" variant="default" className="text-lg px-8">
                  Student Sign Up
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Join a Quiz
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>© 2025 Paperless. Empowering Independent Teachers.</p>
        </div>
      </footer>
    </div>
  );
}
