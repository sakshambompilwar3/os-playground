/**
 * src/lib/types.ts
 * Unified data schema for OS Playground.
 * Designed for future database migrations (e.g., Supabase / PostgreSQL).
 */

export interface HubEntry {
  num: string;
  title: string;
  desc: string;
  to: string;
  comingSoon?: boolean;
}

export interface OSTopic {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  color: string;
  rotation: string;
  ready: boolean;
  notesReady?: boolean;
  quizReady?: boolean;
  /** Topic banner label shown on hero board and topic hubs (e.g. "OPERATING SYSTEMS · CPU SCHEDULING") */
  lectureLabel: string;
  /** Short chalk tagline shown on hero board */
  tagline: string;
  /** Primary simulator route for this topic */
  simulatorLink: string;
  /** Primary notes route for this topic */
  notesLink: string;
  /** Academic unit identifier (e.g. "Unit II · Scheduling") */
  unitLabel?: string | undefined;
  /** Notable quote or textbook excerpt */
  quote?: string | undefined;
  /** Ordered list of sub-activities shown in the Table of Contents hub */
  hubEntries: HubEntry[];
}

export interface NotesSection {
  id: string;
  title: string;
  subtitle: string;
  content: string[];
  takeaway: string;
  svgDiagram?: string;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
  codeSnippet?: string;
}

export interface QuizQuestion {
  q: string;
  a: string[];
  c: number;
  explanation?: string;
}
