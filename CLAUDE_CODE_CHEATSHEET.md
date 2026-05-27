# Claude Code — Quick Reference Card

> Keep this open in a tab when you're working in Claude Code.

## Essential Slash Commands

| Command | What It Does |
|---|---|
| `/help` | Lists all available slash commands in your current session |
| `/clear` | Wipes conversation history completely. File edits persist. Use when switching to a totally new task. |
| `/compact [focus]` | Compresses history into a summary. Add a focus hint: `/compact focus on the avatar rendering pipeline` |
| `/model` | Switch between Opus and Sonnet mid-session |
| `/doctor` | Diagnoses your Claude Code setup — checks install, config, permissions. Press `f` to auto-fix issues. |
| `/init` | Generates a starter CLAUDE.md (you already have one — skip this) |
| `/memory` | Edit CLAUDE.md memory files directly from the terminal |
| `/cost` | Shows token usage for the current session |
| `/review` | Asks Claude to review code you just built |
| `/diff` | View file changes made in the current session |
| `/config` | View or change Claude Code configuration |
| `/permissions` | View or update tool permissions |
| `/mcp` | Manage MCP server connections |
| `/status` | View account and system status |

## When to Use Opus vs Sonnet

| Use Opus For | Use Sonnet For |
|---|---|
| Multi-file refactors (e.g., extracting components from AlkiApp.jsx) | Quick single-file edits and bug fixes |
| Implementing new features that touch multiple files | Renaming, moving, or reorganizing files |
| Complex logic (recommendation engine changes, morph math) | Generating boilerplate or repetitive code |
| Architecture decisions that need reasoning | Simple questions about your codebase |
| Debugging tricky state issues across components | Adding comments or documentation |
| Writing the Eidolon engine (Sprint 1–7 work) | CSS/styling tweaks |

**Rule of thumb:** If you'd spend 20+ minutes explaining the task in conversation, use Opus. If you can describe it in one sentence, Sonnet saves quota.

Switch mid-session with `/model` — no need to start over.

## Context Management

### When to `/compact`
- Session is getting long (20+ back-and-forth exchanges)
- Claude starts "forgetting" instructions from earlier in the conversation
- You're switching from one task to a related-but-different task
- Add a focus hint so it keeps what matters: `/compact keep the Dashboard prop-drilling fix context`

### When to `/clear`
- You're done with one task and starting something completely unrelated
- Claude is confused and compacting won't help
- You want a truly fresh start

### When to Start a New Session
- After a major feature is done and committed
- If the session has been compacted 2–3 times already
- When you need to work on a different part of the app with no shared context

## Prompting Style: Claude Code vs Claude.ai

### In Claude.ai (design sessions)
- Conversational, exploratory, back-and-forth
- "What do you think about..." / "Help me think through..."
- Long context, rich discussion, prototyping ideas

### In Claude Code (implementation sessions)
- **Directive.** Tell it what to do, not what to think about.
- **Specific.** Name the files, the functions, the exact behavior.
- **One task at a time.** Don't ask for 5 things in one prompt.

**Good Claude Code prompts:**
```
Read src/app/screens/Dashboard.jsx and add the missing setEidolons 
and setActiveEidolonId props from AlkiApp.jsx. The Dashboard needs 
these to create new eidolons without crashing.
```

```
In src/app/lib/morphTargets.js, add a new morph key for abs_def 
that activates as a steep sigmoid when BF crosses below 14% for 
males and 22% for females. Scale it by muscle_overall.
```

**Bad Claude Code prompts:**
```
Fix the eidolon bug
```
(Which bug? Which file? What should the fix look like?)

```
Make the app better
```
(Better how? Be specific.)

## Your Workflow Cheat Sheet

```
1. Design in Claude.ai conversation
2. Open Claude Code in the alki-app directory
3. Start with: "Read AlkiApp.jsx and [specific screen file]. Then [specific task]."
4. Review what Claude did — ask it to explain if anything's unclear
5. /diff to see all changes
6. /review if you want a sanity check
7. Commit in GitHub Desktop, Vercel auto-deploys
8. Austin tests on mobile
9. Bug feedback → ALKI_BUG_THREAD_SEED.md workflow
```

## Useful Patterns

**"Read before you edit"** — Always start implementation prompts with "Read [file] first, then..."
This prevents Claude from working off stale assumptions.

**"Explain your reasoning"** — If Claude makes an architectural choice you didn't ask for, ask "Why did you do it that way?" before accepting.

**Batching small fixes** — If you have 3 small bugs on the same screen, list them all in one prompt. Claude handles batches well when they're in the same file.

**The escape hatch** — If Claude is going down a wrong path, say "Stop. Undo that. Here's what I actually want..." Don't try to redirect gently — be direct.
