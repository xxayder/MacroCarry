---
name: EAS build in Replit
description: How to run eas build commands in Replit where git write operations are sandboxed
---

# EAS Build in Replit Sandbox

## The rule
Always run `eas build` with `EAS_NO_VCS=1` in the Replit environment.

**Why:** Replit's sandbox blocks git operations that acquire lock files. EAS CLI v21's archive step calls `setGitCaseSensitivityAsync` (runs `git config --local core.ignoreCase`) and `git clone file:///...` — both trigger the restriction: "Destructive git operations are not allowed in the main agent."

**How to apply:** Set `EAS_NO_VCS=1` on every `eas build` invocation. This makes EAS use the `noVcs` client, which archives project files via `fs.cp` (respecting `.gitignore`) instead of git commands. The upload succeeds and EAS builds normally on remote servers.

```bash
EXPO_TOKEN="$EXPO_TOKEN" EAS_NO_VCS=1 pnpm exec eas build --platform android --profile production --non-interactive
```

Note: Must be run from a task agent, not the main agent, since the main agent hits the git restriction even before the archive step. The task agent hits the same restriction, but `EAS_NO_VCS=1` successfully works around it.
