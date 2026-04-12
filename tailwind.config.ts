import type { Config } from "tailwindcss";

const proveColor = (step: number) => `rgb(var(--prove-${step}-rgb) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        prove: {
          50: proveColor(50),
          100: proveColor(100),
          200: proveColor(200),
          300: proveColor(300),
          400: proveColor(400),
          500: proveColor(500),
          600: proveColor(600),
          700: proveColor(700),
          800: proveColor(800),
          900: proveColor(900),
          950: proveColor(950),
        },
        accent: {
          coral: "#ff6b6b",
          gold: "#f59e0b",
          violet: "#8b5cf6",
        },
      },
      fontFamily: {
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px rgb(15 23 42 / 0.06)",
        "soft-lg": "0 2px 4px rgb(15 23 42 / 0.04), 0 12px 40px rgb(15 23 42 / 0.08)",
        nav: "0 8px 32px rgb(15 23 42 / 0.1), 0 2px 8px rgb(15 23 42 / 0.06)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "nav-enter": "navEnter 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "page-enter": "pageEnter 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "welcome": "welcome 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "welcome-step": "welcome 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards",
        "welcome-headline": "welcome 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards",
        "welcome-list": "welcome 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards",
        "welcome-cta": "welcome 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.55s forwards",
        "welcome-dots": "welcome 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.7s forwards",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        navEnter: {
          "0%": { opacity: "0", filter: "blur(8px)", transform: "translateY(12px)" },
          "100%": { opacity: "1", filter: "blur(0px)", transform: "translateY(0)" },
        },
        pageEnter: {
          "0%": { opacity: "0", filter: "blur(8px)", transform: "translateY(12px)" },
          "100%": { opacity: "1", filter: "blur(0px)", transform: "translateY(0)" },
        },
        welcome: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
