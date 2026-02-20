import type { Config } from "tailwindcss";

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
          50: "#f0fdf6",
          100: "#dcfceb",
          200: "#bbf7d6",
          300: "#86efb4",
          400: "#4ade8a",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
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
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
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
