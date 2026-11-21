import type { HubEntry, Lab } from "./types";

export const LAB_HUB_ENTRIES: HubEntry[] = [
  { num: "1.", title: "Deadlock Lab", desc: "Watch processes get stuck", to: "/labs/deadlock" },
  { num: "2.", title: "Producer-Consumer Lab", desc: "Fill and empty a shared buffer", to: "/labs/producer-consumer" },
  { num: "3.", title: "Dining Philosophers Lab", desc: "Five thinkers, five forks", to: "/labs/dining-philosophers" },
];

export const OS_LABS: Lab[] = [
  {
    slug: "deadlock",
    title: "Deadlock Lab",
    description: "Watch processes get stuck when requests form a cycle",
    to: "/labs/deadlock",
    color: "bg-highlight",
    rotation: "-2deg",
  },
  {
    slug: "producer-consumer",
    title: "Producer-Consumer Lab",
    description: "Fill and empty a shared buffer with counting semaphores",
    to: "/labs/producer-consumer",
    color: "bg-accent/70",
    rotation: "1.5deg",
  },
  {
    slug: "dining-philosophers",
    title: "Dining Philosophers Lab",
    description: "Five thinkers, five forks: see deadlock and try the fix",
    to: "/labs/dining-philosophers",
    color: "bg-success/40",
    rotation: "-1deg",
  },
];
