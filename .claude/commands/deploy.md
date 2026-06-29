# /deploy

Commits all staged changes and pushes to origin/main → triggers Railway auto-deploy.

**Usage:** `/deploy` or `/deploy "your commit message"`

---

## What This Command Does

1. Asks for a commit message (or generates one from today's date).
2. Stages all changes, commits, and pushes.
3. Displays the final result.

---

## Execution Steps

### Step 1 — Determine Commit Message

If the user supplied a message after `/deploy`, use it.
Otherwise, use the default: `deploy: $(date +%F)`

```bash
MSG="${1:-deploy: $(date +%F)}"
echo "📝 Commit message: $MSG"
```

### Step 2 — Check for Changes

```bash
git status --short
```

If the working tree is clean (no output), tell the user:
> "✅ Nothing to commit — working tree is already clean. Push anyway? (y/n)"

### Step 3 — Stage, Commit, Push

```bash
git add -A
git commit -m "$MSG

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
```

### Step 4 — Show Result

On success:
```
╔══════════════════════════════════════════╗
║        DEPLOY TRIGGERED ✅               ║
╚══════════════════════════════════════════╝

📦 Commit: [short hash] — [message]
🚀 Pushed to: origin/main
🔗 Railway will auto-deploy from this push.

Monitor at: https://railway.app/dashboard
```

On any failure, display the error and stop. **Do NOT force-push. Do NOT skip hooks.**

---

## Safety Rules

- Never use `--force` or `--no-verify`.
- If `git push` fails (upstream diverged), run `git pull --rebase` first, then retry.
- If the commit fails because of a pre-commit hook error, fix the issue and create a NEW commit — never amend.
- If `.env` or secrets appear in `git status`, warn the user and abort.
