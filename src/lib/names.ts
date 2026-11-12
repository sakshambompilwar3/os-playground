export const APP_NAME_POOL: string[] = [
  "Netflix",
  "Chrome",
  "Spotify",
  "YouTube",
  "WhatsApp",
  "VS Code",
  "Zoom",
  "Slack",
  "Discord",
  "Photoshop",
  "Word",
  "Excel",
  "Terminal",
  "Safari",
  "Steam",
  "Notes",
  "Calendar",
  "Maps",
];

/**
 * Picks `count` unique names from APP_NAME_POOL avoiding `excludeNames` where possible.
 */
export function pickUniqueAppNames(count: number, excludeNames: Iterable<string> = []): string[] {
  const excluded = new Set(Array.from(excludeNames, (n) => n.trim().toLowerCase()));
  const available = APP_NAME_POOL.filter((name) => !excluded.has(name.toLowerCase()));
  const pool = available.length >= count ? [...available] : [...APP_NAME_POOL];

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }

  return Array.from({ length: count }, (_, idx) => pool[idx % pool.length]!);
}
