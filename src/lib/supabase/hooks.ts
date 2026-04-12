"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./client";

export function useSupabaseAuth(): {
  user: User | null;
  loading: boolean;
  supabase: SupabaseClient | null;
} {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | undefined;

    createClient().then((client) => {
      if (!mounted || !client) {
        if (mounted) setLoading(false);
        return;
      }
      setSupabase(client);

      const {
        data: { subscription: sub },
      } = client.auth.onAuthStateChange((_event, session) => {
        if (mounted) setUser(session?.user ?? null);
      });
      subscription = sub;

      // Never set loading=false before we know the persisted session — otherwise AppContext
      // briefly sees !user while !loading and wipes goals (mobile / cold start).
      void client.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (!mounted) return;
          setUser(session?.user ?? null);
        })
        .catch(() => {
          if (mounted) setUser(null);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading, supabase };
}
