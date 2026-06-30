"use client";

import { useState, type FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-3xl mb-3">Supabase nao configurado</h1>
        <p className="text-paper/70">
          Adicione as variaveis NEXT_PUBLIC_SUPABASE_URL e
          NEXT_PUBLIC_SUPABASE_ANON_KEY para habilitar login e historico.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-4xl mb-2 text-center">Entrar</h1>
      <p className="text-paper/60 text-center mb-8">
        Receba um link magico por email. Sem senha.
      </p>

      {sent ? (
        <div className="halftone-surface panel-frame rounded p-6 text-center">
          <p className="text-paper">
            Link enviado para <span className="font-mono">{email}</span>.
          </p>
          <p className="text-paper/60 text-sm mt-2">
            Abra o email e clique no link para entrar.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@exemplo.com"
            className="w-full rounded border-2 border-ink-line bg-ink-soft px-4 py-3 text-paper placeholder:text-paper/30 focus:border-seal outline-none"
          />
          {error && <p className="text-seal text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-seal py-3 font-display text-lg tracking-wide text-ink hover:bg-seal-dim transition-colors disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar link magico"}
          </button>
        </form>
      )}
    </div>
  );
}
