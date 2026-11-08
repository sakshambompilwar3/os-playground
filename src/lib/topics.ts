/**
 * Central registry of OS topics.
 * Add a new entry here and it will appear on the Home page and in the nav.
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
  /** Sub-pages for ready topics (Banker's). Placeholder topics get auto tabs. */
  subLinks?: { to: string; label: string }[];
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
    subLinks: [
      { to: "/learn", label: "Learn" },
      { to: "/simulator", label: "Simulator" },
      { to: "/request", label: "Requests" },
      { to: "/deadlock", label: "Deadlock Lab" },
      { to: "/quiz", label: "Quiz" },
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
  },
  {
    slug: "memory-allocation",
    title: "Memory Allocation",
    shortTitle: "Memory",
    description: "Paging, segmentation & page replacement",
    color: "bg-success/40",
    rotation: "-1.5deg",
    ready: false,
  },
  {
    slug: "disk-scheduling",
    title: "Disk Scheduling",
    shortTitle: "Disk Sched.",
    description: "FCFS, SSTF, SCAN, C-SCAN & LOOK",
    color: "bg-primary/25",
    rotation: "3deg",
    ready: false,
  },
];
