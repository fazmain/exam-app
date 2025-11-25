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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          Modern Quiz Platform
        </div>
        <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          Create & Take Quizzes
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Made Simple
          </span>
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Build engaging quizzes with math equations and images. Track student performance with powerful analytics.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              Start Creating
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-2 hover:border-blue-500 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Rich Content</CardTitle>
              <CardDescription>
                Create quizzes with LaTeX math equations and images for comprehensive assessments.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-purple-500 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>Easy Sharing</CardTitle>
              <CardDescription>
                Share quiz links with students. They can sign up and take quizzes instantly.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-green-500 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Track student performance with detailed analytics and insights.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20 py-8 bg-white/50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 dark:text-gray-400">
          <p>© 2025 QuizMaster. Built with Next.js & Firebase.</p>
        </div>
      </footer>
    </div>
  );
}
