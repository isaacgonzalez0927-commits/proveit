# Using a custom AI for proof verification

ProveIt can use **your friend's AI** to verify proof photos. When configured, it is used first (before OpenAI or demo mode).

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
