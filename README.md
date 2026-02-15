# ProveIt

**Set a goal. Take a photo. Prove it.**

ProveIt sends you reminders for daily and weekly goals. You take a photo of yourself doing the goal, and AI verifies you actually did it.

## Features

- **Daily & weekly goals** with reminders (browser notifications)
- **Photo proof** via camera or file upload
- **AI verification** (OpenAI GPT-4 Vision when `OPENAI_API_KEY` is set; otherwise demo mode)
- **Streaks** and recent activity
- **Plans**: Free (1 daily + 1 weekly), Pro ($9.99/mo – 10 each + extras), Premium ($19.99/mo – unlimited + all features)

## Quick start

```bash
cd proveit
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with any email (demo; no password). Add goals, submit a photo, and see AI verification in action.

## AI verification

- **With API key**: Set `OPENAI_API_KEY` in `.env.local`. The app will use GPT-4 Vision to check that the photo matches the goal.
- **Without**: The app runs in demo mode and returns a simulated pass/fail so you can test the flow.

## Pricing (demo)

- **Free**: 1 daily goal, 1 weekly goal, AI verification, basic streaks.
- **Pro** ($9.99/mo or $99/year): 10 daily, 10 weekly, custom reminders, export, no ads.
- **Premium** ($19.99/mo or $199/year): Unlimited goals, priority verification, accountability partner, weekly digest.

In production, wire Pro and Premium to Stripe (or your payment provider) using the plan IDs in `src/types/index.ts`.

## Tech stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS, Lucide icons
- Client-side state + `localStorage` (no backend required for demo)
- Optional: OpenAI API for real image verification

## Project structure

- `src/app/` – Pages (home, dashboard, goals, submit proof, pricing)
- `src/components/` – Header, notification prompt, notification scheduler
- `src/context/AppContext.tsx` – Global state (user, goals, submissions)
- `src/lib/store.ts` – Local storage helpers and plan limits
- `src/app/api/verify/route.ts` – AI verification endpoint

Enjoy proving it.
