import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { runScheduling } from "@/lib/scheduling";
import { simulateMemoryAllocation, DEFAULT_EXAMPLE_BLOCKS, DEFAULT_EXAMPLE_MEM_PROCESSES } from "@/lib/memory";
import { simulateDiskScheduling, DEFAULT_EXAMPLE_CYLINDERS, DEFAULT_EXAMPLE_HEAD, DEFAULT_EXAMPLE_REQUEST_CYLINDERS } from "@/lib/disk";
import { runSafety, SAMPLE } from "@/lib/bankers";

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
  });
});
