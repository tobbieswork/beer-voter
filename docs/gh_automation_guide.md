# GitHub CLI (`gh`) & Git Automation Guide

The GitHub CLI (`gh`) is a powerful tool that brings GitHub features directly to your terminal. When combined with standard Git, you can automate your entire workflow—from creating branches and committing code to opening and merging pull requests.

---

## 1. Authentication & Status

Before automating, make sure your CLI is authenticated.

```bash
# Check current authentication status
gh auth status

# Authenticate with your GitHub account (interactive browser or token)
gh auth login

# Refresh or add scopes (e.g., if you need write access to packages or actions)
gh auth refresh -s write:packages -s workflow
```

---

## 2. Common GitHub CLI Commands

Below are the most high-frequency commands categorized by task.

### 🌿 Branch & Pull Request Automation

Instead of manually pushing a branch, going to github.com, and clicking buttons to open a PR, you can do it all in one or two commands:

| Command                      | Action                                          | Useful Flags                                                                    |
| :--------------------------- | :---------------------------------------------- | :------------------------------------------------------------------------------ |
| `gh pr create`               | Creates a Pull Request from your current branch | `--web` (opens browser), `--fill` (auto-uses commits for title/body), `--draft` |
| `gh pr status`               | Shows status of PRs relevant to you             | None                                                                            |
| `gh pr list`                 | Lists open PRs in the repository                | `--author "<username>"`, `--state open/closed`                                  |
| `gh pr checkout <pr-number>` | Checks out a pull request locally               | None                                                                            |
| `gh pr merge <pr-number>`    | Merges a pull request                           | `--merge`, `--squash`, `--rebase`, `--delete-branch`                            |

### 🐛 Issue Management

Manage issues without leaving the terminal:

```bash
# List open issues
gh issue list

# Create a new issue quickly
gh issue create --title "Fix: Button styling on mobile" --body "The vote button overflows on screen widths below 360px."

# View a specific issue
gh issue view 42
```

### 🚀 Actions & CI/CD Runs

Monitor and trigger GitHub Actions workflows:

```bash
# View recent workflow runs
gh run list

# Watch a running workflow live in the terminal
gh run watch <run-id>

# Trigger a manual workflow (repository dispatch / workflow_dispatch)
gh workflow run deploy.yml --ref main
```

---

## 3. Automation Scripts

You can write simple shell scripts to automate sequential operations. Here are two highly useful automation templates.

### Template A: The "One-Key PR" Script (`git-pr.sh`)

This script formats, lints, typechecks, stages, commits, pushes, and creates a GitHub pull request automatically.

```bash
#!/bin/bash
# Exit immediately if any command exits with a non-zero status
set -e

echo "🧹 Running formatting and linters..."
npm run format
npm run lint

echo "🧪 Running type check..."
npx tsc --noEmit

echo "💾 Staging all changes..."
git add -A

# Ask for a commit message if none is provided as an argument
COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
  read -p "💬 Enter commit message: " COMMIT_MSG
fi

echo "📝 Committing changes..."
git commit -m "$COMMIT_MSG"

# Get current branch name
BRANCH=$(git branch --show-current)

echo "📤 Pushing branch '$BRANCH' to remote..."
git push -u origin "$BRANCH"

echo "🔀 Creating GitHub Pull Request..."
# --fill automatically uses the commit message as the PR title/description
gh pr create --fill

echo "✅ Done!"
```

### Template B: Automatic Hotfix / Fast-Merge Script (`git-hotfix.sh`)

For small changes or fixes, this script commits, pushes, creates a PR, and immediately merges it once status checks pass.

```bash
#!/bin/bash
set -e

COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
  echo "❌ Error: Please provide a commit message."
  exit 1
fi

git add -A
git commit -m "hotfix: $COMMIT_MSG"
BRANCH=$(git branch --show-current)
git push -u origin "$BRANCH"

echo "🔥 Creating and auto-merging PR..."
# Create the PR and capture the URL
PR_URL=$(gh pr create --title "hotfix: $COMMIT_MSG" --body "Automated hotfix push." --draft=false)

# Merge the PR (squash merge, delete local/remote branch after merge)
gh pr merge "$PR_URL" --squash --delete-branch
```

---

## 4. Custom GitHub CLI Aliases

You can configure aliases directly inside `gh` to make command execution even faster.

```bash
# Create a shortcut to list open PRs assigned to you
gh alias set mine "pr list --assignee=@me"

# Create a shortcut to view current run status
gh alias set runs "run list --limit 5"

# Usage:
gh mine
gh runs
```
