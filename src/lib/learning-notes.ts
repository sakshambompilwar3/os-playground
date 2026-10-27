export const learningNotes = [
  { t: "1. Deadlock", b: "Processes wait forever for resources held by each other. Four conditions: mutual exclusion, hold & wait, no preemption, circular wait." },
  { t: "2. Avoidance", b: "Instead of detecting deadlock later, the OS checks every request ahead of time and refuses ones that could lead to trouble." },
  { t: "3. Data structures", b: "Available[m], Max[n][m], Allocation[n][m], and Need[n][m] = Max − Allocation." },
  { t: "4. Safety algorithm", b: "Work = Available. Find a process whose Need ≤ Work, pretend it finishes, add its Allocation back to Work. Repeat. If all finish → SAFE." },
  { t: "5. Request algorithm", b: "If Request ≤ Need and Request ≤ Available, pretend to grant it, then run the safety algorithm. Safe → grant. Unsafe → roll back and wait." },
  { t: "6. Limitations", b: "Needs the max demand in advance, a fixed number of processes and resources during each check, and costs O(m·n²) per check." },
];