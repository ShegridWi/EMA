#!/usr/bin/env node
// Checks that the local machine has what this project needs before
// scaffolding/running the Next.js + TypeScript + Prisma + PostgreSQL stack.
// Usage: node scripts/check-env.mjs

import { execFileSync } from "node:child_process";

const MIN_NODE_MAJOR = 20;

const OK = "OK";
const WARN = "WARN";
const FAIL = "FAIL";

const results = [];

function run(cmd, args) {
  try {
    // shell: true so Windows can resolve .cmd/.bat shims (e.g. npm, docker)
    // that live on PATH but aren't directly executable.
    return execFileSync(cmd, args, {
      stdio: ["ignore", "pipe", "ignore"],
      shell: true,
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function check(name, { required, detect, note }) {
  const output = detect();
  if (output) {
    results.push({ name, status: OK, detail: output });
  } else {
    results.push({
      name,
      status: required ? FAIL : WARN,
      detail: note,
    });
  }
}

// Node.js
check("Node.js", {
  required: true,
  detect: () => {
    const version = process.version; // e.g. v20.11.0
    const major = Number(version.slice(1).split(".")[0]);
    return major >= MIN_NODE_MAJOR ? version : null;
  },
  note: `requires Node.js >= ${MIN_NODE_MAJOR} (found ${process.version}). Install an LTS release from https://nodejs.org.`,
});

// npm
check("npm", {
  required: true,
  detect: () => {
    const v = run("npm", ["--version"]);
    return v ? `v${v}` : null;
  },
  note: "npm should ship with Node.js — reinstall Node.js if missing.",
});

// git
check("git", {
  required: true,
  detect: () => run("git", ["--version"]),
  note: "required for version control and DigitalOcean App Platform git-based deploys. Install from https://git-scm.com.",
});

// PostgreSQL client (psql) — optional, useful for debugging the DB directly
check("psql (PostgreSQL client)", {
  required: false,
  detect: () => run("psql", ["--version"]),
  note: "optional — only needed if you want to inspect the database directly instead of through Prisma Studio.",
});

// Docker — optional, useful for running a local PostgreSQL instance
check("Docker", {
  required: false,
  detect: () => run("docker", ["--version"]),
  note: "optional — convenient for running a local PostgreSQL container. Skip if you connect to a remote/managed database instead.",
});

const width = Math.max(...results.map((r) => r.name.length)) + 2;

console.log("\nEnvironment check for EMA (Next.js + TS + Prisma + PostgreSQL)\n");

let hasFailure = false;
for (const { name, status, detail } of results) {
  const icon = status === OK ? "✅" : status === WARN ? "⚠️ " : "❌";
  const label = name.padEnd(width);
  console.log(`${icon} ${label} ${detail}`);
  if (status === FAIL) hasFailure = true;
}

console.log("");

if (hasFailure) {
  console.log("Missing required tooling — install the items marked ❌ above.\n");
  process.exit(1);
} else {
  console.log("All required tooling is present. Optional items (⚠️) are recommendations, not blockers.\n");
  process.exit(0);
}
