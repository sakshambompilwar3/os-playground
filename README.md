# OS Playground

Learn Operating Systems by playing with them: simulators, notes and quizzes for the OS syllabus.

Live site: https://os-banker-s-algo.vercel.app

![OS Playground Home and Topics](docs/screenshots/home-hero.png)

![CPU Scheduling Comparison Bench](docs/screenshots/cpu-comparison.png)

---

## What is inside

### 5 Topics
- **Banker's Algorithm**: check safe states, test resource requests, study textbook notes, and take the quiz.
- **CPU Scheduling**: simulate FCFS, SJF, SRTF, Round Robin, and Priority scheduling with live Gantt charts, compare algorithms side by side, study notes, and take the quiz.
- **Memory Allocation**: place processes with First Fit, Best Fit, Worst Fit, and Next Fit, compare memory utilization and fragmentation, study notes, and take the quiz.
- **Disk Scheduling**: watch the disk head serve requests with FCFS, SSTF, SCAN, LOOK, and circular sweeps, compare seek distances, study notes, and take the quiz.
- **Page Replacement**: step through FIFO, LRU, and Optimal page replacement with frame tables, detect Belady's anomaly, calculate effective access time, compare hit ratios, study notes, and take the quiz.

Every topic has interactive lecture notes, a step-by-step simulator, a self-grading pop quiz, and a side-by-side comparison bench (for CPU, Memory, Disk, and Paging).

### 3 Labs
- **Deadlock Lab** (`/labs/deadlock`): watch three processes deadlock in a circular wait, then test how the Banker prevents it.
- **Producer-Consumer Lab** (`/labs/producer-consumer`): watch a producer and consumer share a bounded buffer using counting semaphores.
- **Dining Philosophers Lab** (`/labs/dining-philosophers`): see five thinkers deadlock on a round table, then test the asymmetric fork fix.

---

## How it works

All calculations are done by plain, tested TypeScript functions, so every result matches standard textbook problems. The site runs completely in the browser as a client-side web app, with no accounts or database required.

---

## Coming next

- Practice mode with randomized exam-style problems
- Teacher login to share custom notes and quiz sets
- AI chatbot to answer OS homework questions

*(These features are planned additions for future updates.)*

---

## Run it on your computer

Make sure Node.js (v18 or newer) is installed.

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open http://localhost:8080 in your browser.

To run the automated tests:
```bash
npm test
```

To build for production:
```bash
npm run build
```

---

## Built with

React, TypeScript, TanStack Start, Tailwind CSS, Vite; hosted on Vercel.

---

## Project structure

- `src/lib/`: pure calculation logic for scheduling, memory, disk, paging, and Banker's algorithm
- `src/lib/labs/`: calculation logic for bounded buffer and dining philosophers labs
- `src/routes/`: pages and routing for topics, simulators, comparisons, notes, quizzes, and labs
- `src/components/`: chalkboard cards, navigation, controls, and shared visual components
- `src/test/`: unit tests checking calculations and invariants against textbook traces

---

## About

Built by Saksham Bompilwar, an IT student at Rajarshi Shahu College of Engineering, Pune, as an Operating Systems course project.
