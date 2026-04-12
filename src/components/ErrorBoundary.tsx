"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-transparent px-4">
          <div className="max-w-sm rounded-2xl border border-slate-200/90 p-8 text-center shadow-soft-lg dark:border-slate-700/80 glass-card">
            <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">Something went wrong</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              The app hit an error. Try refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 w-full rounded-xl bg-prove-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-prove-700 btn-glass-primary"
            >
              Reload page
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
