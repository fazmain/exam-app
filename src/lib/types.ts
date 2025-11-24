export interface Option {
    id: string;
    text: string;
    isCorrect: boolean;
    imageUrl?: string;
}

export interface Question {
    id: string;
    text: string;
    options: Option[];
    imageUrl?: string;
    randomizeOptions?: boolean;
    description?: string; // Explanation for the answer
}

export interface QuizSettings {
    gradingSystem: boolean;
    timer: number; // in minutes
    negativeMarking: boolean;
    randomizeQuestions: boolean;
    pointsPerQuestion: number;
    negativeMarkingPoints: number;
    lockedAnswers: boolean; // If true, users can't change answer once selected
    isActive: boolean; // If false, quiz is not accepting responses
    allowRetakes?: boolean; // If true, students can take the quiz multiple times
}

export interface Quiz {
    id: string;
    instructorId: string;
    title: string;
    description: string;
    questions: Question[];
    settings: QuizSettings;
    createdAt: any; // Firebase Timestamp
}

export interface Attempt {
    id: string;
    quizId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    score: number;
    totalQuestions: number;
    completedAt: any; // Firebase Timestamp
    timeTaken: number; // in seconds
    answers: Record<string, string>; // questionId -> optionId
}
