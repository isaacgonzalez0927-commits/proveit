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
        setLoading(false);
        return;
      }
      setSupabase(client);

      client.auth.getUser().then(({ data: { user } }) => {
        if (mounted) setUser(user);
      });

      const result = client.auth.onAuthStateChange((_event, session) => {
        if (mounted) setUser(session?.user ?? null);
      });
      subscription = result.data.subscription;

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading, supabase };
}
