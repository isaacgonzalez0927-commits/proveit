# macOS 10.15 (Catalina) Setup Guide

This guide helps you keep building ProveIt after moving to a Mac on **macOS 10.15**.

## What works on Catalina

- Next.js web app development (`npm run dev`)
- Building and testing the web app in browser
- Phone testing over Wi-Fi using your computer IP

## What is limited on Catalina

This repo includes Capacitor iOS setup (`@capacitor/cli` v8, `@capacitor/ios` v8, iOS 15 target in `ios/App/CapApp-SPM/Package.swift`).

On macOS 10.15, you generally cannot run the newest Xcode versions required for modern Capacitor/iOS builds. In practice:

- Keep building the app as a web app on Catalina
- Use a newer Mac (or cloud Mac CI) for App Store/iOS binary work

## 1) Install base tools

```bash
# Apple Command Line Tools
xcode-select --install

# Homebrew (if you do not have it)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## 2) Install Node with nvm

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Reload shell config (choose the one you use)
source ~/.bash_profile 2>/dev/null || source ~/.zshrc 2>/dev/null

# Use Node 22 for this repo tooling
nvm install 22
nvm use 22
node -v
npm -v
```

## 3) Set up the project

From the repo root:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

### Minimum env values

Edit `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional:

- `OPENAI_API_KEY` for real AI verification (otherwise demo mode is used)

## 4) Test on your phone (same Wi-Fi)

The dev server already binds to all interfaces (`next dev --hostname 0.0.0.0`).

1. Find your Mac IP
2. Open `http://YOUR_IP:3000` on phone
3. Add Supabase redirect URL:
   - `http://YOUR_IP:3000/api/auth/callback`

See `PHONE-SETUP.md` for full details.

## 5) Keep momentum: daily workflow

```bash
nvm use 22
npm install         # only when deps changed
npm run dev         # build features
npm run build       # quick confidence check before pushing
```

## 6) When you are ready for iOS shipping

Use one of these:

- A newer Mac with current Xcode
- Cloud Mac CI/build service
- A separate branch that downgrades Capacitor/iOS targets (more maintenance, not recommended unless required)
