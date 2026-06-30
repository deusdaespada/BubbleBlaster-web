"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoaded(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
      setLoaded(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return null;
  }

  if (!loaded) {
    return <span className="text-paper/40 text-xs font-mono">...</span>;
  }

  if (!email) {
    return (
      <Link
        href="/login"
        className="rounded border border-paper/30 px-3 py-1 text-paper/80 hover:border-seal hover:text-seal transition-colors"
      >
        Entrar
      </Link>
    );
  }

  return (
    <button
      onClick={() => supabase?.auth.signOut()}
      className="text-paper/60 hover:text-seal transition-colors text-xs font-mono"
      title="Sair"
    >
      {email}
    </button>
  );
}
