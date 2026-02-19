# Decept — Build Plan

## Overview

**2 Truths 1 Lie** game for Reddit. Players submit 3 statements (2 true, 1 lie), others vote on which is the lie. Reveals after threshold.

**Stack:** Svelte 5 + Hono + Devvit Web 0.12.x + Tailwind CSS 4 + Bun

---

## Game Flow

### 1. Create (Poster)
- Player sees form with 3 text inputs (each 10–200 chars)
- Privately marks which one is the lie (radio select)
- Hits "Post" → creates a Devvit experience post
- Post shows: "🔍 Can you spot the lie? [Username] posted 3 statements. One is fake."

### 2. Vote (Voters)
- See 3 statements as tappable cards
- Tap the one they think is the lie → confirm
- After voting: "Your vote is locked! [X] people have voted so far"
- One vote per user per post (enforced server-side)
- Cannot vote on own post

### 3. Reveal
- Triggers when EITHER:
  - 50 votes reached, OR
  - 24 hours since posting (whichever first)
- Vote threshold check: on every vote, if `totalVotes >= 50` → reveal
- Time-based check: scheduled job runs hourly, reveals expired posts
- Reveal screen shows:
  - All 3 statements — lie in red, truths in green
  - Vote distribution percentages
  - Poster's deception score: "🎭 [Username] fooled 68% of voters!"

### 4. Scoring

**For the Poster (Liar Score):**
- Base: `percentage_fooled` (0–100)
- If fooled > 70%: bonus +20
- If fooled > 90%: bonus +50
- Vote-weight multiplier: `score × min(1 + total_votes / 100, 3.0)` — capped at 3x

**For Voters (Detective Score):**
- Correct guess: +10
- Correct guess when < 30% got it right: +25 ("Sharp Eye")
- Wrong guess: +2 (participation)

---

## Redis Schema

All keys use `decept:` prefix.

### Post Data
```
decept:post:{postId}
  → Hash {
    authorId: string,
    statement1: string,
    statement2: string,
    statement3: string,
    lieIndex: string ("1" | "2" | "3"),
    createdAt: string (timestamp ms),
    revealed: string ("true" | "false"),
    totalVotes: string (number),
    votesFor1: string (number),
    votesFor2: string (number),
    votesFor3: string (number)
  }
```

### Vote Tracking
```
decept:post:{postId}:voters
  → Set of userIds (prevents double voting)

decept:post:{postId}:vote:{userId}
  → String ("1" | "2" | "3")
```

### User Data
```
decept:user:{userId}:stats
  → Hash {
    totalLiarScore: string (number),
    totalDetectiveScore: string (number),
    totalPosts: string (number),
    totalVotes: string (number),
    correctVotes: string (number)
  }
```

### Rate Limiting
```
decept:ratelimit:{userId}:posts:{date}
  → String (count, YYYY-MM-DD)

decept:ratelimit:{userId}:votes:{date}
  → String (count, YYYY-MM-DD)
```

### Unrevealed Posts Index
```
decept:posts:unrevealed
  → Sorted Set { member: postId, score: createdAt (timestamp ms) }
```

---

## Profanity Filter (v1)

- Word-list in `src/server/lib/profanity.ts`
- Check all 3 statements on submission (server-side)
- Normalize before checking: lowercase, leetspeak substitutions (@ → a, 0 → o, 1 → i, 3 → e, $ → s)
- Reject with `{ status: 'error', message: 'Statement contains inappropriate language' }`

---

## API Routes (Hono)

### Public API

```typescript
// POST /api/create
// Body: { statement1, statement2, statement3, lieIndex }
// Validates: 10-200 chars each, lieIndex 1-3, profanity filter, rate limit (5/day)
// Creates Redis entries + experience post via reddit.submitCustomPost()
// Returns: { status: 'success', data: { postId } }

// POST /api/vote
// Body: { postId, vote: 1|2|3 }
// Validates: not own post, not already voted, not revealed, rate limit (50/day)
// If totalVotes >= 50 after increment → reveal
// Returns: { status: 'success', data: { totalVotes } }

// GET /api/post/:postId
// Returns statements, vote counts (only if revealed), user's vote (if any)
// NEVER returns lieIndex before reveal

// GET /api/user/stats
// Returns current user's stats hash
```

### Internal Endpoints

```typescript
// POST /internal/menu/post-create — Mod menu: create a Decept post
// POST /internal/on-app-install — Trigger: on app install
// POST /internal/jobs/reveal-expired — Scheduled job: hourly reveal check
```

---

## Svelte Views

### `App.svelte` — Router
- States: `create`, `play`, `results`
- Uses `$state()` for current view

### `src/client/views/Create.svelte`
- 3 text inputs with character counter (10–200)
- Radio buttons to mark the lie
- "Post" button → validates → creates post

### `src/client/views/Play.svelte`
- 3 statement cards (tappable)
- Tap → "This is the lie?" confirmation
- After voting: locked state with vote count
- If revealed: redirect to Results

### `src/client/views/Results.svelte`
- Truths green ✅, lie red ❌
- Vote distribution bars (horizontal %)
- Deception score: "🎭 [User] fooled X%!"
- "You got it right! 🔍" or "You got fooled! 😱"

### Reusable Components (`src/client/components/`)
- `StatementCard.svelte` — tappable statement with selected/revealed states
- `VoteBar.svelte` — horizontal percentage bar for results

---

## Devvit Configuration

### `devvit.json`
```json
{
  "$schema": "https://developers.reddit.com/schema/config-file.v1.json",
  "name": "decept",
  "post": {
    "dir": "dist/client",
    "entrypoints": {
      "default": {
        "entry": "src/client/index.html",
        "height": "tall",
        "inline": true
      }
    }
  },
  "server": {
    "dir": "dist/server",
    "entry": "index.cjs"
  },
  "menu": {
    "items": [
      {
        "label": "Create a Decept post",
        "description": "Start a 2 Truths 1 Lie game",
        "location": "subreddit",
        "forUserType": "moderator",
        "endpoint": "/internal/menu/post-create"
      }
    ]
  },
  "triggers": {
    "onAppInstall": "/internal/on-app-install"
  },
  "scheduler": {
    "jobs": [
      {
        "name": "reveal-expired",
        "endpoint": "/internal/jobs/reveal-expired",
        "cron": "0 * * * *"
      }
    ]
  }
}
```

### Scheduled Job: `reveal-expired`
- Runs hourly via cron
- Queries `decept:posts:unrevealed` for posts where `createdAt + 86400000 < Date.now()`
- For each: calculate scores, update user stats, remove from unrevealed set

---

## File Structure

```
src/
├── server/
│   ├── index.ts                 # Hono app, all route handlers, createServer()
│   ├── post.ts                  # Experience post creation (reddit.submitCustomPost)
│   ├── tsconfig.json
│   └── lib/
│       ├── constants.ts         # Scoring constants, rate limits
│       ├── scoring.ts           # Score calculation
│       ├── profanity.ts         # Profanity filter
│       └── redis-helpers.ts     # Key builders, common read/write
├── client/
│   ├── App.svelte               # Root component, view router
│   ├── app.css                  # @import "tailwindcss"
│   ├── index.html
│   ├── main.ts                  # mount(App, { target })
│   ├── svelte.config.ts
│   ├── tsconfig.json
│   ├── vite-env.d.ts
│   ├── views/
│   │   ├── Create.svelte
│   │   ├── Play.svelte
│   │   └── Results.svelte
│   ├── components/
│   │   ├── StatementCard.svelte
│   │   └── VoteBar.svelte
│   └── lib/
│       └── api.ts               # Typed fetch wrappers
└── shared/
    ├── tsconfig.json
    └── types.ts                 # PostData, UserStats, API types
```

---

## Implementation Order

1. **Shared types** — `src/shared/types.ts`
2. **Server lib** — constants, redis-helpers, profanity, scoring
3. **Create flow** — form → validate → profanity → Redis → `reddit.submitCustomPost()`
4. **Vote flow** — validate → store → count → threshold reveal
5. **Reveal logic** — score calc → update stats → remove from unrevealed
6. **Scheduled job** — `/internal/jobs/reveal-expired` handler
7. **UI: Create** → **Play** → **Results** views
8. **Playtest on Reddit**

---

## Validation Rules (Server-Side)

- All 3 statements required, 10–200 chars each
- `lieIndex` must be 1, 2, or 3
- Profanity filter on all 3 statements
- Cannot vote on own post
- Cannot vote twice on same post
- Cannot vote after reveal
- All scoring server-side (no client trust)
- Rate limit: 5 posts/day, 50 votes/day per user
- Vote-weight multiplier capped at 3x
