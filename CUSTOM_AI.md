# Using a custom AI for proof verification

Proveit can use **your friend's AI** to verify proof photos. When configured, it is used first (before OpenAI or demo mode).

## 1. What your friend’s API must do

Their server should expose **one HTTP endpoint** that:

- **Method:** `POST`
- **Request body (JSON):**
  ```json
  {
    "imageBase64": "<base64-encoded image string>",
    "goalTitle": "Run 2 miles",
    "goalDescription": "Optional extra details about the goal"
  }
  ```
- **Response (JSON):**
  ```json
  {
    "verified": true,
    "feedback": "Photo clearly shows you running. Goal verified!"
  }
  ```
  - `verified`: `true` = proof accepted, `false` = rejected
  - `feedback`: short message shown to the user (one sentence is enough)

Optional: If their API requires auth, they can accept a header like `Authorization: Bearer <key>`. You set that key in your app env (see below).

## 2. What you set in the app

In your **deploy environment** (e.g. Vercel) or in **`.env.local`** for local dev, add:

```bash
# Required: URL of your friend’s verification endpoint
CUSTOM_AI_VERIFY_URL=https://their-api.com/verify

# Optional: if their API uses a secret key
CUSTOM_AI_API_KEY=your-secret-key
```

The app sends the same JSON body above to that URL and expects the `{ verified, feedback }` JSON back. No code changes are needed once the URL (and optional key) are set.

## 3. Priority order

1. If `CUSTOM_AI_VERIFY_URL` is set **and** the client sends an image → use your friend’s AI.
2. Else if `OPENAI_API_KEY` is set and there’s an image → use OpenAI GPT-4 Vision.
3. Else → demo mode (random pass/fail, no real AI).

So once their API is live, set `CUSTOM_AI_VERIFY_URL` (and `CUSTOM_AI_API_KEY` if they use it) and the app will use it automatically.

---

## Proof suggestions (before the user creates a goal)

When someone adds a goal, they must **pick one of 2–3 AI-generated photo ideas** (e.g. “selfie at the gym” vs “photo of you doing an exercise”). They can **only** choose from that list at creation time and in goal settings (refresh loads a new list for the **same goal title**).

### Easiest: use OpenAI only (no second server)

If **`OPENAI_API_KEY`** is set in Vercel (same key you use for photo verification) and you **do not** set `CUSTOM_AI_SUGGESTIONS_URL`, Proveit will call **OpenAI `gpt-4o-mini`** to generate 2–3 suggestion strings from the goal title. Redeploy after adding the key. No other setup.

If you **do** set `CUSTOM_AI_SUGGESTIONS_URL`, that URL is tried first; if it fails or returns a bad shape, the app falls back to OpenAI when `OPENAI_API_KEY` is set, then to built-in placeholder lines.

### Endpoint your AI can expose (optional custom server)

- **Method:** `POST`
- **Request body (JSON):** `{ "title": "Go to gym", "goalTitle": "Go to gym" }` (same string; some backends read one or the other)
- **Response:** any JSON the parser can read **2–3** short, actionable strings from, including:
  - `{ "suggestions": ["...", "...", "..."] }`
  - `{ "prompts": [...] }`, `{ "ideas": [...] }`, `{ "photoIdeas": [...] }`, or similar keys matching `suggestions|prompts|ideas|photo|proof|options|hints`
  - `{ "data": { "suggestions": [...] } }` (nested `data`, `result`, `payload`, `output`, `body`, `response`)
  - A **top-level JSON array** of strings
  - An array of objects like `{ "text": "..." }` or `{ "prompt": "..." }`
  - OpenAI-style `{ "choices": [{ "message": { "content": "<JSON string of one of the above>" } }] }`

### Env vars (optional)

```bash
CUSTOM_AI_SUGGESTIONS_URL=https://your-api.com/goal-proof-suggestions
# Same purpose if you prefer another name (first non-empty wins):
# CUSTOM_AI_GOAL_SUGGESTIONS_URL=...
# AI_PROOF_SUGGESTIONS_URL=...
# Optional Bearer token:
CUSTOM_AI_SUGGESTIONS_API_KEY=your-secret
```

**`CUSTOM_AI_VERIFY_URL` does not supply goal photo ideas.** You still need one of the suggestion URLs above (or the app keeps the built-in fallback lines).

If no suggestion URL is set (or the HTTP call / JSON shape fails), the app uses **short fallback** prompts so the UI still works; check server logs for `[proofSuggestions]` if your API returns 200 but prompts stay generic.

### Verification API (reminder)

The verify endpoint can also receive **`proofRequirement`** (the string the user chose). Your custom verify API should accept:

`{ "imageBase64", "goalTitle", "goalDescription", "proofRequirement" }`

and judge whether the photo matches that **specific** instruction, not only the title.
