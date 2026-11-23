import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { isValidElement } from "react";
import { BANKERS_NOTES } from "../lib/bankers-notes";
import { CPU_SCHEDULING_NOTES } from "../lib/cpu-scheduling-notes";
import { MEMORY_ALLOCATION_NOTES } from "../lib/memory-allocation-notes";
import { PAGE_REPLACEMENT_NOTES } from "../lib/page-replacement-notes";
import { DISK_SCHEDULING_NOTES } from "../lib/disk-scheduling-notes";

describe("Notes Content & Accessibility Verification", () => {
  const noteSets = [
    { name: "Banker's Notes", notes: BANKERS_NOTES },
    { name: "CPU Scheduling Notes", notes: CPU_SCHEDULING_NOTES },
    { name: "Memory Allocation Notes", notes: MEMORY_ALLOCATION_NOTES },
    { name: "Page Replacement Notes", notes: PAGE_REPLACEMENT_NOTES },
    { name: "Disk Scheduling Notes", notes: DISK_SCHEDULING_NOTES },
  ];

  for (const { name, notes } of noteSets) {
    describe(name, () => {
      it("contains sections with valid titles and non-empty body text", () => {
        expect(notes.length).toBeGreaterThan(0);
        for (const note of notes as any[]) {
          const title = note.t ?? note.title;
          const body = note.b ?? (Array.isArray(note.content) ? note.content.join(" ") : note.subtitle);

          expect(title).toBeDefined();
          expect(title.trim().length).toBeGreaterThan(2);

          expect(body).toBeDefined();
          expect(body.trim().length).toBeGreaterThan(10);
        }
      });

      it("does not contain unfinished placeholder text", () => {
        const forbiddenPatterns = [/todo/i, /lorem ipsum/i, /\btbd\b/i];
        for (const note of notes as any[]) {
          const title = note.t ?? note.title ?? "";
          const body = note.b ?? (Array.isArray(note.content) ? note.content.join(" ") : note.subtitle ?? "");

          for (const pattern of forbiddenPatterns) {
            expect(title).not.toMatch(pattern);
            expect(body).not.toMatch(pattern);
          }
        }
      });

      it("ensures every rendered SVG diagram has an accessible aria-label or role", () => {
        for (const note of notes as any[]) {
          if (note.extra && isValidElement(note.extra)) {
            const { container } = render(note.extra);
            const svgs = container.querySelectorAll("svg");
            for (const svg of Array.from(svgs)) {
              const ariaLabel = svg.getAttribute("aria-label");
              const ariaHidden = svg.getAttribute("aria-hidden");
              const title = svg.querySelector("title");

              // Every SVG diagram must either have an explicit aria-label/title or be marked aria-hidden if purely decorative
              const hasAccessibleName = (ariaLabel && ariaLabel.trim().length > 0) || (title && title.textContent?.trim().length) || ariaHidden === "true";
              expect(hasAccessibleName).toBe(true);
            }
          }
        }
      });
    });
  }
});
