/**
 * Central registry of OS topics.
 * Add a new entry here and it will appear on the Home page, hero carousel, and nav.
 * Set `ready: false` for placeholder topics that show "Coming soon" tabs.
 */
export interface OSTopic {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  color: string;
  rotation: string;
  ready: boolean;
  /** Lecture label shown on the hero chalkboard. */
  lectureLabel: string;
  /** Chalk tagline shown on the hero chalkboard. */
  tagline: string;
  /** Link to this topic's simulator page. */
  simulatorLink: string;
  /** Link to this topic's notes page. */
  notesLink: string;
  /** Sub-pages for the topic hub. */
  hubLinks: { to: string; label: string }[];
}

export const OS_TOPICS: OSTopic[] = [
  {
    slug: "bankers",
    title: "Banker's Algorithm",
    shortTitle: "Banker's",
    description: "Deadlock avoidance with safe sequences",
    color: "bg-highlight",
    rotation: "-3deg",
    ready: true,
    lectureLabel: "CS-301 · Operating Systems · Lecture 7",
    tagline: "Safe state ⇒ no deadlock",
    simulatorLink: "/simulator",
    notesLink: "/notes/bankers",
    hubLinks: [
      { to: "/notes/bankers", label: "Notes" },
      { to: "/simulator", label: "Simulator" },
      { to: "/request", label: "Requests" },
      { to: "/deadlock", label: "Deadlock Lab" },
      { to: "/quiz/bankers", label: "Quiz" },
    ],
  },
  {
    slug: "cpu-scheduling",
    title: "CPU Scheduling",
    shortTitle: "CPU Sched.",
    description: "FCFS, SJF, Round Robin & more",
    color: "bg-accent/70",
    rotation: "2deg",
    ready: false,
    lectureLabel: "CS-301 · Operating Systems · Lecture 9",
    tagline: "Who runs next ⇒ the scheduler decides",
    simulatorLink: "/cpu-scheduling",
    notesLink: "/notes/cpu-scheduling",
    hubLinks: [
      { to: "/notes/cpu-scheduling", label: "Notes" },
      { to: "/cpu-scheduling", label: "Simulator" },
      { to: "/quiz/cpu-scheduling", label: "Quiz" },
    ],
  },
  {
    slug: "memory-allocation",
    title: "Memory Allocation",
    shortTitle: "Memory",
    description: "Paging, segmentation & page replacement",
    color: "bg-success/40",
    rotation: "-1.5deg",
    ready: false,
    lectureLabel: "CS-301 · Operating Systems · Lecture 11",
    tagline: "Best fit ⇒ fewer holes",
    simulatorLink: "/memory-allocation",
    notesLink: "/notes/memory-allocation",
    hubLinks: [
      { to: "/notes/memory-allocation", label: "Notes" },
      { to: "/memory-allocation", label: "Simulator" },
      { to: "/quiz/memory-allocation", label: "Quiz" },
    ],
  },
  {
    slug: "disk-scheduling",
    title: "Disk Scheduling",
    shortTitle: "Disk Sched.",
    description: "FCFS, SSTF, SCAN, C-SCAN & LOOK",
    color: "bg-primary/25",
    rotation: "3deg",
    ready: false,
    lectureLabel: "CS-301 · Operating Systems · Lecture 13",
    tagline: "Shorter seek ⇒ faster disk",
    simulatorLink: "/disk-scheduling",
    notesLink: "/notes/disk-scheduling",
    hubLinks: [
      { to: "/notes/disk-scheduling", label: "Notes" },
      { to: "/disk-scheduling", label: "Simulator" },
      { to: "/quiz/disk-scheduling", label: "Quiz" },
    ],
  },
];
