import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { OS_TOPICS } from "@/lib/topics";

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

describe("Practice Mode UI & Routing Integration", () => {
  it("renders /practice catalog with all 5 topics", async () => {
    const router = createTestRouter("/practice");
    await act(async () => {
      router.load();
    });

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Practice Mode", level: 1 })).toBeInTheDocument();

    for (const topic of OS_TOPICS) {
      expect(screen.getByText(topic.title)).toBeInTheDocument();
      const link = screen.getByRole("link", { name: new RegExp(topic.title) });
      expect(link).toHaveAttribute("href", `/practice/${topic.slug}`);
    }
  });

  it("loads /practice/cpu-scheduling and executes interaction flow", async () => {
    // Fixed seed so problem is deterministic
    const router = createTestRouter("/practice/cpu-scheduling?seed=CPTEST&level=easy");
    await act(async () => {
      router.load();
    });

    render(<RouterProvider router={router} />);

    // Check headings
    expect(await screen.findByText("CPU Scheduling")).toBeInTheDocument();
    expect(screen.getByText(/OPERATING SYSTEMS · PRACTICE/i)).toBeInTheDocument();

    // Check level control buttons
    const easyBtn = await screen.findByRole("button", { name: /easy/i });
    const medBtn = screen.getByRole("button", { name: /medium/i });
    const hardBtn = screen.getByRole("button", { name: /hard/i });
    expect(easyBtn).toBeInTheDocument();
    expect(medBtn).toBeInTheDocument();
    expect(hardBtn).toBeInTheDocument();
    expect(easyBtn).toHaveAttribute("aria-pressed", "true");

    // Check code display
    expect(screen.getByText("CPTEST")).toBeInTheDocument();

    // Check question input
    const checkBtns = screen.getAllByRole("button", { name: "Check" });
    expect(checkBtns.length).toBeGreaterThanOrEqual(1);

    // Try submitting empty answer
    fireEvent.click(checkBtns[0]!);
    expect((await screen.findAllByText(/Please enter/i)).length).toBeGreaterThan(0);

    // Try wrong answer
    const numInput = screen.getByPlaceholderText(/5\.75/i);
    fireEvent.change(numInput, { target: { value: "999.99" } });
    const currentCheckBtns = screen.getAllByRole("button", { name: "Check" });
    fireEvent.click(currentCheckBtns[0]!);
    expect((await screen.findAllByText(/Not quite/i)).length).toBeGreaterThan(0);

    // Click Show Solution
    const showSolutionBtn = screen.getByRole("button", { name: "Show Solution" });
    fireEvent.click(showSolutionBtn);

    expect(await screen.findByText("Complete Step-by-Step Solution")).toBeInTheDocument();
    expect(screen.getByText(/Gantt Chart Timeline/i)).toBeInTheDocument();
  });

  it("verifies SiteNav contains Practice link between Quiz and Labs", async () => {
    const router = createTestRouter("/");
    await act(async () => {
      router.load();
    });

    render(<RouterProvider router={router} />);

    const practiceNavLinks = screen.getAllByRole("link", { name: "Practice" });
    expect(practiceNavLinks.length).toBeGreaterThanOrEqual(1);
    expect(practiceNavLinks[0]).toHaveAttribute("href", "/practice");
  });

  it("verifies each topic hub contains a Practice entry linking to /practice/<topic>", () => {
    for (const topic of OS_TOPICS) {
      const practiceEntry = topic.hubEntries.find((e) => e.title === "Practice");
      expect(practiceEntry).toBeDefined();
      expect(practiceEntry?.to).toBe(`/practice/${topic.slug}?from=hub`);
      expect(practiceEntry?.desc).toBe("Solve fresh random problems");
    }
  });
});
