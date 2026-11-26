import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import adapter from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("../../", import.meta.url));

/** The version is declared once, in the VERSION file at the repository root. */
const version = readFileSync(`${root}VERSION`, "utf8").trim();

function commit(): string {
  if (process.env["QOHESION_COMMIT"]) return process.env["QOHESION_COMMIT"].slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

export default defineConfig(({ command }) => ({
  plugins: [
    sveltekit({
      adapter: adapter(),
      // Content Security Policy for the built application. Development servers inject inline code, so it applies to builds only.
      ...(command === "build"
        ? {
            csp: {
              directives: {
                "default-src": ["none"],
                "script-src": ["self"],
                "style-src": ["self"],
                "img-src": ["self", "data:"],
                "font-src": ["self"],
                "connect-src": ["self"],
                "form-action": ["self"],
                "base-uri": ["none"],
                "frame-ancestors": ["none"],
                "object-src": ["none"],
              },
            },
          }
        : {}),
    }),
  ],
  define: {
    __QOHESION_VERSION__: JSON.stringify(version),
    __QOHESION_COMMIT__: JSON.stringify(commit()),
    __QOHESION_BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  server: { fs: { allow: [root] } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
}));
