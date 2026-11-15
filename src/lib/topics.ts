/**
 * Central registry of OS topics.
 * Add a new entry here and it will appear on the Home page, hero carousel, and hubs.
 * Set `ready: false` for placeholder topics that show "Coming soon" pages.
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
  /** Lecture label shown on the hero chalkboard. */
  lectureLabel: string;
  /** Chalk tagline shown on the hero chalkboard. */
  tagline: string;
  /** Link to this topic's simulator/hub page from hero board. */
  simulatorLink: string;
  /** Link to this topic's notes page. */
  notesLink: string;
  /** Optional unit label and quote shown in the topic's Table of Contents hub. */
  unitLabel?: string | undefined;
  quote?: string | undefined;
  /** Numbered entries for the topic hub's Table of Contents. */
  hubEntries: HubEntry[];
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
    unitLabel: "Unit IV · Deadlocks",
    quote: "“Safe states guarantee freedom from deadlock.” — Dijkstra",
    hubEntries: [
      { num: "1.", title: "Learn", desc: "Theory with drawings", to: "/notes/bankers" },
      { num: "2.", title: "Simulator", desc: "Step through the safety check", to: "/simulator" },
      { num: "3.", title: "Requests", desc: "Grant or deny a process", to: "/request" },
      { num: "4.", title: "Deadlock Lab", desc: "Watch processes get stuck", to: "/deadlock" },
      { num: "5.", title: "Pop Quiz", desc: "Test before the exam", to: "/quiz/bankers" },
    ],
  },
  {
    slug: "cpu-scheduling",
    title: "CPU Scheduling",
    shortTitle: "CPU Sched.",
    description: "FCFS, SJF, Round Robin & more",
    color: "bg-accent/70",
    rotation: "2deg",
    ready: true,
    lectureLabel: "CS-301 · Operating Systems · Lecture 9",
    tagline: "Who runs next ⇒ the scheduler decides",
    simulatorLink: "/cpu-scheduling/simulator",
    notesLink: "/notes/cpu-scheduling",
    unitLabel: "Unit II · Scheduling",
    hubEntries: [
      { num: "1.", title: "Learn", desc: "Theory, with drawings", to: "/notes/cpu-scheduling" },
      { num: "2.", title: "Simulator", desc: "Watch the CPU pick the next process", to: "/cpu-scheduling/simulator" },
      { num: "3.", title: "Comparison", desc: "Which algorithm wins?", to: "/comparison/cpu-scheduling" },
      { num: "4.", title: "Pop Quiz", desc: "Test before the exam", to: "/quiz/cpu-scheduling" },
    ],
  },
  {
    slug: "memory-allocation",
    title: "Memory Allocation",
    shortTitle: "Memory",
    description: "Paging, segmentation & page replacement",
    color: "bg-success/40",
    rotation: "-1.5deg",
    ready: true,
    notesReady: true,
    quizReady: true,
    lectureLabel: "CS-301 · Operating Systems · Lecture 11",
    tagline: "Best fit ⇒ fewer holes",
    simulatorLink: "/memory-allocation/simulator",
    notesLink: "/notes/memory-allocation",
    unitLabel: "Unit III · Memory",
    hubEntries: [
      { num: "1.", title: "Learn", desc: "Partitions, holes and fragmentation", to: "/notes/memory-allocation" },
      { num: "2.", title: "Simulator", desc: "Place processes into memory", to: "/memory-allocation/simulator" },
      { num: "3.", title: "Comparison", desc: "Which fit wastes the least?", to: "/comparison/memory-allocation" },
      { num: "4.", title: "Pop Quiz", desc: "Test before the exam", to: "/quiz/memory-allocation" },
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
    hubEntries: [
      { num: "1.", title: "Learn", desc: "Theory, with drawings", to: "/notes/disk-scheduling" },
      { num: "2.", title: "Simulator", desc: "Coming soon", to: "/disk-scheduling" },
      { num: "3.", title: "Pop Quiz", desc: "Test before the exam", to: "/quiz/disk-scheduling" },
    ],
  },
];
