/**
 * Site-wide configuration and metadata helpers.
 */

export const SITE_URL = (import.meta.env.VITE_SITE_URL || "").replace(/\/+$/, "");

/**
 * Returns an absolute URL if VITE_SITE_URL is defined, or a clean relative path otherwise.
 */
export function getAbsoluteUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return SITE_URL ? `${SITE_URL}${cleanPath}` : cleanPath;
}

export const SITE_NAME = "OS Playground";
export const SITE_DEFAULT_TITLE = "OS Playground | Learn Operating Systems by Playing";
export const SITE_DEFAULT_DESCRIPTION =
  "Interactive simulators, visual notes and pop quizzes for Operating Systems: Banker's Algorithm, CPU Scheduling, Memory Allocation, and Disk Scheduling.";
