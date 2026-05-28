#!/usr/bin/env node
// .claude/hooks/post-build-smoke.mjs
// ─────────────────────────────────────────────────────────────────────────────
// PostToolUse hook. Fires after every Bash tool call, but only does work when
// the command was a SUCCESSFUL `npm run build` — otherwise it exits instantly
// and silently. On a good build it runs the Playwright smoke suite
// (tests/smoke.spec.mjs), which checks the app and auto-files any failures to
// Supabase. Wired in .claude/settings.json under hooks → PostToolUse → Bash.
// ─────────────────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

// Read the hook payload (JSON on stdin).
let payload = {};
try { payload = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { payload = {}; }

const toolName = payload.tool_name || '';
const cmd = (payload.tool_input && payload.tool_input.command) || '';

// Only react to build commands.
const isBuild = /\bnpm\s+run\s+build\b/.test(cmd) || /\bnext\s+build\b/.test(cmd);
if (toolName !== 'Bash' || !isBuild) process.exit(0);

// Only smoke a build that actually succeeded. The Bash tool_response isn't a
// guaranteed shape, so we scan whatever we got for failure markers and bail if
// the build clearly broke.
const blob = JSON.stringify(payload.tool_response || payload).toLowerCase();
if (/failed to compile|compiled with errors|build error|error occurred prerendering|command failed/.test(blob)) {
  console.log('Smoke: skipped — build did not succeed.');
  process.exit(0);
}

const smoke = path.join(ROOT, 'tests', 'smoke.spec.mjs');
if (!existsSync(smoke)) process.exit(0);

console.log('Smoke: build succeeded — running Playwright smoke suite...');
spawnSync(process.execPath, [smoke], { cwd: ROOT, stdio: 'inherit' });
process.exit(0); // never block the session on smoke results — failures are filed to Supabase
