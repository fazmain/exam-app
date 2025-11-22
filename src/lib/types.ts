export interface Option {
    id: string;
    text: string;
    isCorrect: boolean;
}

export interface Question {
    id: string;
    text: string;
    options: Option[];
    imageUrl?: string;
    randomizeOptions?: boolean;
}

export interface QuizSettings {
    gradingSystem: boolean;
    timer: number; // in minutes
    negativeMarking: boolean;
    randomizeQuestions: boolean;
    pointsPerQuestion: number;
    negativeMarkingPoints: number;
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
