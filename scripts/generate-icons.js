/**
 * scripts/generate-icons.js
 * Generates the full icon set and social share image for OS Playground:
 * - public/favicon.svg
 * - public/favicon.ico (MS Windows icon wrapping 32x32 PNG)
 * - public/apple-touch-icon.png (180x180)
 * - public/icon-192.png (192x192)
 * - public/icon-512.png (512x512)
 * - public/og-image.png (1200x630)
 * - public/site.webmanifest
 *
 * Uses built-in macOS `sips` for crisp vector-to-PNG rasterization,
 * followed by standard binary assembly for the ICO header, avoiding
 * external dependencies to keep lockfiles intact.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.resolve(rootDir, "public");

const THEME = {
  chalkGreen: "#224c37",
  chalkDarkGreen: "#1b3d2c",
  chalkYellow: "#f5df74",
  chalkWhite: "#f1efe0",
};

// 1. Generate favicon.svg (512x512 source)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="104" fill="${THEME.chalkGreen}"/>
  <rect x="20" y="20" width="472" height="472" rx="88" fill="none" stroke="${THEME.chalkWhite}" stroke-opacity="0.18" stroke-width="8" stroke-dasharray="16 8"/>
  <text x="256" y="328" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="240" font-weight="900" fill="${THEME.chalkYellow}" text-anchor="middle" letter-spacing="-4">OS</text>
</svg>`;

const faviconSvgPath = path.join(publicDir, "favicon.svg");
fs.writeFileSync(faviconSvgPath, iconSvg, "utf8");
console.log("Wrote:", faviconSvgPath);

// 2. Generate PNGs using sips
const tempSvgPath = path.join(publicDir, "temp-icon.svg");
fs.writeFileSync(tempSvgPath, iconSvg, "utf8");

const icon512Path = path.join(publicDir, "icon-512.png");
execSync(`sips -s format png "${tempSvgPath}" --out "${icon512Path}"`, { stdio: "inherit" });
console.log("Generated:", icon512Path);

const icon192Path = path.join(publicDir, "icon-192.png");
execSync(`sips -z 192 192 "${icon512Path}" --out "${icon192Path}"`, { stdio: "inherit" });
console.log("Generated:", icon192Path);

const appleTouchIconPath = path.join(publicDir, "apple-touch-icon.png");
execSync(`sips -z 180 180 "${icon512Path}" --out "${appleTouchIconPath}"`, { stdio: "inherit" });
console.log("Generated:", appleTouchIconPath);

// 3. Generate 32x32 PNG and wrap into favicon.ico
const icon32Path = path.join(publicDir, "temp-32.png");
execSync(`sips -z 32 32 "${icon512Path}" --out "${icon32Path}"`, { stdio: "inherit" });
const png32Buffer = fs.readFileSync(icon32Path);

// 22-byte ICO header wrapping 32x32 PNG
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0); // Reserved (must be 0)
icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // Number of images = 1
icoHeader.writeUInt8(32, 6);   // Width = 32
icoHeader.writeUInt8(32, 7);   // Height = 32
icoHeader.writeUInt8(0, 8);    // Color palette = 0
icoHeader.writeUInt8(0, 9);    // Reserved = 0
icoHeader.writeUInt16LE(1, 10); // Color planes = 1
icoHeader.writeUInt16LE(32, 12); // Bits per pixel = 32
icoHeader.writeUInt32LE(png32Buffer.length, 14); // Image data size in bytes
icoHeader.writeUInt32LE(22, 18); // Offset to image data

const faviconIcoPath = path.join(publicDir, "favicon.ico");
fs.writeFileSync(faviconIcoPath, Buffer.concat([icoHeader, png32Buffer]));
console.log("Generated:", faviconIcoPath);

// Clean up temporary files
if (fs.existsSync(tempSvgPath)) fs.unlinkSync(tempSvgPath);
if (fs.existsSync(icon32Path)) fs.unlinkSync(icon32Path);

// 4. Generate og-image.png (1200x630)
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <pattern id="chalk-dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="12" cy="12" r="1" fill="${THEME.chalkWhite}" fill-opacity="0.08"/>
    </pattern>
  </defs>
  <!-- Background -->
  <rect width="1200" height="630" fill="${THEME.chalkGreen}"/>
  <rect width="1200" height="630" fill="url(#chalk-dots)"/>
  
  <!-- Outer Chalkboard Frame -->
  <rect x="36" y="36" width="1128" height="558" rx="24" fill="none" stroke="${THEME.chalkWhite}" stroke-opacity="0.22" stroke-width="4" stroke-dasharray="24 12"/>
  <rect x="46" y="46" width="1108" height="538" rx="16" fill="none" stroke="${THEME.chalkWhite}" stroke-opacity="0.1" stroke-width="1.5"/>

  <!-- Badge / Icon on top -->
  <g transform="translate(600, 180)">
    <rect x="-60" y="-60" width="120" height="120" rx="26" fill="${THEME.chalkDarkGreen}" stroke="${THEME.chalkYellow}" stroke-opacity="0.5" stroke-width="3"/>
    <text x="0" y="22" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" fill="${THEME.chalkYellow}" text-anchor="middle" letter-spacing="-1">OS</text>
  </g>

  <!-- Title: OS Playground -->
  <text x="600" y="340" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="72" font-weight="900" fill="${THEME.chalkYellow}" text-anchor="middle" letter-spacing="-1">OS Playground</text>

  <!-- Subtitle -->
  <text x="600" y="405" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="600" fill="${THEME.chalkWhite}" text-anchor="middle" letter-spacing="0.5">Interactive Simulators, Visual Notes &amp; Quizzes for Operating Systems</text>

  <!-- Topic Badges -->
  <g transform="translate(600, 475)">
    <g transform="translate(-400, 0)">
      <rect x="0" y="0" width="180" height="40" rx="20" fill="${THEME.chalkDarkGreen}" stroke="${THEME.chalkWhite}" stroke-opacity="0.25" stroke-width="1.5"/>
      <text x="90" y="25" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="${THEME.chalkYellow}" text-anchor="middle" letter-spacing="0.5">BANKER'S ALGO</text>
    </g>
    <g transform="translate(-195, 0)">
      <rect x="0" y="0" width="185" height="40" rx="20" fill="${THEME.chalkDarkGreen}" stroke="${THEME.chalkWhite}" stroke-opacity="0.25" stroke-width="1.5"/>
      <text x="92.5" y="25" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="${THEME.chalkYellow}" text-anchor="middle" letter-spacing="0.5">CPU SCHEDULING</text>
    </g>
    <g transform="translate(15, 0)">
      <rect x="0" y="0" width="195" height="40" rx="20" fill="${THEME.chalkDarkGreen}" stroke="${THEME.chalkWhite}" stroke-opacity="0.25" stroke-width="1.5"/>
      <text x="97.5" y="25" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="${THEME.chalkYellow}" text-anchor="middle" letter-spacing="0.5">MEMORY ALLOCATION</text>
    </g>
    <g transform="translate(235, 0)">
      <rect x="0" y="0" width="180" height="40" rx="20" fill="${THEME.chalkDarkGreen}" stroke="${THEME.chalkWhite}" stroke-opacity="0.25" stroke-width="1.5"/>
      <text x="90" y="25" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="${THEME.chalkYellow}" text-anchor="middle" letter-spacing="0.5">DISK SCHEDULING</text>
    </g>
  </g>
</svg>`;

const ogSvgPath = path.join(publicDir, "temp-og.svg");
fs.writeFileSync(ogSvgPath, ogSvg, "utf8");

const ogPngPath = path.join(publicDir, "og-image.png");
execSync(`sips -s format png "${ogSvgPath}" --out "${ogPngPath}"`, { stdio: "inherit" });
console.log("Generated:", ogPngPath);

if (fs.existsSync(ogSvgPath)) fs.unlinkSync(ogSvgPath);

// 5. Generate site.webmanifest
const manifest = {
  name: "OS Playground",
  short_name: "OS Playground",
  description: "Interactive Simulators, Visual Notes & Quizzes for Operating Systems",
  icons: [
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png"
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png"
    }
  ],
  theme_color: THEME.chalkGreen,
  background_color: THEME.chalkGreen,
  display: "browser"
};

const manifestPath = path.join(publicDir, "site.webmanifest");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("Wrote:", manifestPath);

console.log("All icons and metadata assets generated successfully!");
