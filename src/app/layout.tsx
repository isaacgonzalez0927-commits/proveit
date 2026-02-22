import type { Metadata, Viewport } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "optional", // Don't block page load waiting for fonts
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "optional", // Don't block page load waiting for fonts
});

export const metadata: Metadata = {
  title: "ProveIt – Set goals. Take a photo. Prove it.",
  description:
    "Get notified for daily and weekly goals, snap a photo of yourself doing it, and let AI verify you actually did it. Free and paid plans.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `
  (function() {
    var themeKey = 'proveit-theme';
    var accentKey = 'proveit-accent-theme';
    var stored = localStorage.getItem(themeKey);
    var theme = stored === 'light' || stored === 'dark' ? stored : 'system';
    var storedAccent = localStorage.getItem(accentKey);
    var accentTheme =
      storedAccent === 'green' ||
      storedAccent === 'pink' ||
      storedAccent === 'violet' ||
      storedAccent === 'ocean' ||
      storedAccent === 'orange' ||
      storedAccent === 'amber' ||
      storedAccent === 'red' ||
      storedAccent === 'purple' ||
      storedAccent === 'indigo' ||
      storedAccent === 'teal'
        ? storedAccent
        : 'green';
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme === 'system' && systemDark);
    document.documentElement.setAttribute('data-accent-theme', accentTheme);
    document.documentElement.classList.toggle('dark', isDark);
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-prove-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col min-h-screen">
          <AppProvider>{children}</AppProvider>
        </div>
      </body>
    </html>
  );
}
