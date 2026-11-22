export type ProblemTopic =
  | "cpu-scheduling"
  | "memory-allocation"
  | "disk-scheduling"
  | "page-replacement"
  | "bankers";

export type ProblemLevel = "easy" | "medium" | "hard";

export type AnswerType = "number" | "choice" | "sequence" | "set";

export interface CommonMistake {
  value: number | string;
  message: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  text: string;
  answerType: AnswerType;
  expected: number | string | string[] | number[];
  choices?: ChoiceOption[];
  unit?: string;
  hint?: string;
  commonMistakes?: CommonMistake[];
}

export interface StatementDataTable {
  caption?: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ProblemStatement {
  intro: string;
  dataTables?: StatementDataTable[];
  rules: string[];
}

export interface SolutionStep {
  title: string;
  text: string;
  table?: StatementDataTable;
  visual?: {
    type: "gantt" | "memory" | "disk" | "paging" | "bankers";
    payload: any;
  };
}

export interface Problem {
  id: string;
  topic: ProblemTopic;
  level: ProblemLevel;
  seed: string;
  title: string;
  statement: ProblemStatement;
  questions: Question[];
  solution: SolutionStep[];
  rawParams?: any;
  subtopic?: string;
}

export interface PracticeOptions {
  sub?: string;
  mode?: string;
  strategy?: string;
  [key: string]: string | undefined;
}

export interface CheckResult {
  correct: boolean;
  status: "correct" | "incorrect" | "invalid";
  normalized?: string;
  message?: string;
}

export class PracticeGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PracticeGenerationError";
  }
}
