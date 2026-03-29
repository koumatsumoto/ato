import { execSync } from "child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

let commitHash: string;
try {
  commitHash = execSync("git rev-parse --short=7 HEAD").toString().trim();
} catch {
  commitHash = "unknown";
}

const jstParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).formatToParts(new Date());
const jstGet = (type: Intl.DateTimeFormatPartTypes) => jstParts.find((p) => p.type === type)!.value;
const timestamp = `${jstGet("month")}${jstGet("day")}T${jstGet("hour")}${jstGet("minute")}`;
const appVersion = `${commitHash}@${timestamp}`;

export default defineConfig({
  base: "/ato/",
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/auth": "http://localhost:8787",
    },
  },
  build: {
    outDir: "dist",
  },
});
