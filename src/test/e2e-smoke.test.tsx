import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { runScheduling } from "@/lib/scheduling";
import { simulateMemoryAllocation, DEFAULT_EXAMPLE_BLOCKS, DEFAULT_EXAMPLE_MEM_PROCESSES } from "@/lib/memory";
import { simulateDiskScheduling, DEFAULT_EXAMPLE_CYLINDERS, DEFAULT_EXAMPLE_HEAD, DEFAULT_EXAMPLE_REQUEST_CYLINDERS } from "@/lib/disk";
import { runSafety, SAMPLE } from "@/lib/bankers";
import { simulatePaging } from "@/lib/paging";

vi.mock("@/components/PageTransition", () => ({
  PageTransition: () => null,
}));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function createTestRouter(initialEntry: string) {
  return createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
}

describe("End-to-End Smoke & Correctness Tests", () => {
  describe("Task 7: Mathematical Benchmarks Verification", () => {
    it("CPU comparison benchmark: FCFS avg WT 5.75, SJF 5.25, SRTF 5.0 for A(0,5), B(1,3), C(2,8), D(3,6)", () => {
      const workload = [
        { id: "P1", name: "A", arrivalTime: 0, burstTime: 5, priority: 1 },
        { id: "P2", name: "B", arrivalTime: 1, burstTime: 3, priority: 2 },
        { id: "P3", name: "C", arrivalTime: 2, burstTime: 8, priority: 3 },
        { id: "P4", name: "D", arrivalTime: 3, burstTime: 6, priority: 4 },
      ];

      const fcfs = runScheduling(workload, { algorithm: "fcfs", contextSwitchTime: 0 });
      expect(fcfs.avgWaitingTime).toBe(5.75);

      const sjf = runScheduling(workload, { algorithm: "sjf", contextSwitchTime: 0 });
      expect(sjf.avgWaitingTime).toBe(5.25);

      const srtf = runScheduling(workload, { algorithm: "srtf", contextSwitchTime: 0 });
      expect(srtf.avgWaitingTime).toBe(5.0);
    });

    it("Memory comparison dynamic Best Fit utilization is 68.65% and the others 43.59%", () => {
      const bestFit = simulateMemoryAllocation(DEFAULT_EXAMPLE_BLOCKS, DEFAULT_EXAMPLE_MEM_PROCESSES, "dynamic", "best-fit");
      expect(Number(bestFit.summary.utilizationPercent.toFixed(2))).toBe(68.65);

      const firstFit = simulateMemoryAllocation(DEFAULT_EXAMPLE_BLOCKS, DEFAULT_EXAMPLE_MEM_PROCESSES, "dynamic", "first-fit");
      expect(Number(firstFit.summary.utilizationPercent.toFixed(2))).toBe(43.59);

      const worstFit = simulateMemoryAllocation(DEFAULT_EXAMPLE_BLOCKS, DEFAULT_EXAMPLE_MEM_PROCESSES, "dynamic", "worst-fit");
      expect(Number(worstFit.summary.utilizationPercent.toFixed(2))).toBe(43.59);

      const nextFit = simulateMemoryAllocation(DEFAULT_EXAMPLE_BLOCKS, DEFAULT_EXAMPLE_MEM_PROCESSES, "dynamic", "next-fit");
      expect(Number(nextFit.summary.utilizationPercent.toFixed(2))).toBe(43.59);
    });

    it("Disk comparison toward higher: SCAN 331, LOOK 299, SSTF 236, FCFS 640", () => {
      const reqs = DEFAULT_EXAMPLE_REQUEST_CYLINDERS.map((c, i) => ({ id: `R${i + 1}`, cylinder: c }));

      const fcfs = simulateDiskScheduling(DEFAULT_EXAMPLE_CYLINDERS, DEFAULT_EXAMPLE_HEAD, reqs, "fcfs", "higher");
      expect(fcfs.totalHeadMovement).toBe(640);

      const sstf = simulateDiskScheduling(DEFAULT_EXAMPLE_CYLINDERS, DEFAULT_EXAMPLE_HEAD, reqs, "sstf", "higher");
      expect(sstf.totalHeadMovement).toBe(236);

      const scan = simulateDiskScheduling(DEFAULT_EXAMPLE_CYLINDERS, DEFAULT_EXAMPLE_HEAD, reqs, "scan", "higher");
      expect(scan.totalHeadMovement).toBe(331);

      const look = simulateDiskScheduling(DEFAULT_EXAMPLE_CYLINDERS, DEFAULT_EXAMPLE_HEAD, reqs, "look", "higher");
      expect(look.totalHeadMovement).toBe(299);
    });

    it("Banker's Algorithm reaches known safe sequence [1, 3, 4, 0, 2]", () => {
      const result = runSafety(SAMPLE.available, SAMPLE.max, SAMPLE.alloc);
      expect(result.safe).toBe(true);
      expect(result.sequence).toEqual([1, 3, 4, 0, 2]);
    });

    it("Page Replacement comparison benchmark: FIFO 15, LRU 12, Optimal 9", () => {
      const refs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
      const fifo = simulatePaging("fifo", refs, 3);
      const lru = simulatePaging("lru", refs, 3);
      const opt = simulatePaging("optimal", refs, 3);

      expect(fifo.faults).toBe(15);
      expect(lru.faults).toBe(12);
      expect(opt.faults).toBe(9);
    });
  });

  describe("Task 1 & 3: Mobile Navigation & Accessibility Smoke Tests", () => {
    it("renders navigation with accessible toggle button and toggles menu", async () => {
      const router = createTestRouter("/");
      await router.load();
      render(<RouterProvider router={router} />);

      const toggleBtn = screen.getByRole("button", { name: /open navigation menu/i });
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
      expect(toggleBtn).toHaveAttribute("aria-controls", "mobile-nav-menu");

      // Open menu
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("region", { name: /mobile navigation menu/i })).toBeInTheDocument();

      // Close menu
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    });

    it("closes mobile menu on Escape key press", async () => {
      const router = createTestRouter("/");
      await router.load();
      render(<RouterProvider router={router} />);

      const toggleBtn = screen.getByRole("button", { name: /open navigation menu/i });
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

      fireEvent.keyDown(window, { key: "Escape" });
      expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    });

    it("verifies key routes load with exactly one h1", async () => {
      const sampleRoutes = [
        "/",
        "/bankers",
        "/simulator",
        "/cpu-scheduling",
        "/cpu-scheduling/simulator",
        "/comparison/cpu-scheduling",
        "/memory-allocation",
        "/memory-allocation/simulator",
        "/disk-scheduling",
        "/disk-scheduling/simulator",
        "/page-replacement",
        "/page-replacement/simulator",
        "/comparison/page-replacement",
        "/notes/page-replacement",
        "/quiz/page-replacement",
        "/labs",
        "/labs/deadlock",
        "/labs/producer-consumer",
        "/labs/dining-philosophers",
        "/notes",
        "/quiz",
      ];

      for (const path of sampleRoutes) {
        cleanup();
        const router = createTestRouter(path);
        await router.load();
        render(<RouterProvider router={router} />);

        const headings = screen.getAllByRole("heading", { level: 1 });
        expect(headings).toHaveLength(1);
      }
    });

    it("verifies /labs lists 3 labs and links to them", async () => {
      cleanup();
      const router = createTestRouter("/labs");
      await router.load();
      render(<RouterProvider router={router} />);

      expect(screen.getByRole("heading", { level: 1, name: /labs/i })).toBeInTheDocument();
      expect(screen.getByText("Deadlock Lab")).toBeInTheDocument();
      expect(screen.getByText("Producer-Consumer Lab")).toBeInTheDocument();
      expect(screen.getByText("Dining Philosophers Lab")).toBeInTheDocument();
    });

    it("verifies Producer-Consumer after Load example and 10 ticks shows produced 8, consumed 5, in buffer 3", async () => {
      cleanup();
      const router = createTestRouter("/labs/producer-consumer");
      await router.load();
      render(<RouterProvider router={router} />);

      // Load example
      const loadExampleBtn = screen.getByRole("button", { name: /load example/i });
      fireEvent.click(loadExampleBtn);

      // Step 10 times
      const stepBtn = screen.getByRole("button", { name: /^step$/i });
      for (let i = 0; i < 10; i++) {
        fireEvent.click(stepBtn);
      }

      // Check text in DOM
      expect(screen.getByText(/8 produced · 5 consumed/i)).toBeInTheDocument();
      expect(screen.getByText(/in buffer: 3 \/ 3/i)).toBeInTheDocument();
    });

    it("verifies Dining Philosophers NAIVE shows deadlock banner after round 2", async () => {
      cleanup();
      const router = createTestRouter("/labs/dining-philosophers");
      await router.load();
      render(<RouterProvider router={router} />);

      const loadExampleBtn = screen.getByRole("button", { name: /load example/i });
      fireEvent.click(loadExampleBtn);

      const stepBtn = screen.getByRole("button", { name: /step \(round\)/i });
      fireEvent.click(stepBtn); // Round 1
      fireEvent.click(stepBtn); // Round 2

      expect(screen.getByText(/deadlock: everyone holds one fork and waits for the next/i)).toBeInTheDocument();
      expect(screen.getByText(/Plato → Aristotle → Socrates → Kant → Descartes → Plato/i)).toBeInTheDocument();
    });

    it("verifies Deadlock Lab works at /labs/deadlock and redirect from /deadlock", async () => {
      cleanup();
      const router = createTestRouter("/deadlock");
      await router.load();
      expect(router.state.location.pathname).toBe("/labs/deadlock");

      render(<RouterProvider router={router} />);
      expect(screen.getByRole("heading", { level: 1, name: /deadlock lab/i })).toBeInTheDocument();
      expect(screen.getByText(/Three processes, three single-instance resources/i)).toBeInTheDocument();

      // Step through
      const nextBtn = screen.getByRole("button", { name: /next →/i });
      fireEvent.click(nextBtn);
      expect(screen.getByText(/Each process grabs one resource/i)).toBeInTheDocument();
    });
  });
});
