"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type Mode = "signin" | "signup";

function getRedirectUrl() {
  // Usa sempre a URL atual (funciona tanto local quanto na Vercel).
  // O dominio precisa estar cadastrado em Supabase > Authentication >
  // URL Configuration > Redirect URLs, senao o Supabase recusa e cai de
  // volta no Site URL padrao (geralmente localhost, causando o erro
  // "ERR_CONNECTION_REFUSED" em produção).
  if (typeof window === "undefined") return undefined;
  return window.location.origin;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured || !supabase) {
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

  async function handleGoogle() {
    setError(null);
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getRedirectUrl() },
    });
    if (error) setError(traduzErro(error.message));
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(traduzErro(error.message));
      return;
    }
    router.push("/");
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError("As senhas nao coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: getRedirectUrl(),
      },
    });
    setLoading(false);

    if (error) {
      setError(traduzErro(error.message));
      return;
    }

    if (data.session) {
      // Confirmacao de email desativada no projeto Supabase: ja entra direto.
      router.push("/");
      return;
    }

    setInfo("Conta criada! Confira seu email para confirmar o cadastro antes de entrar.");
  }

  function traduzErro(msg: string): string {
    const map: Record<string, string> = {
      "Invalid login credentials": "Email ou senha incorretos.",
      "User already registered": "Esse email ja tem uma conta.",
      "Email not confirmed": "Confirme seu email antes de entrar.",
    };
    return map[msg] ?? msg;
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-4xl mb-1 text-center">BubbleBlaster</h1>
      <p className="text-paper/50 text-center mb-8 text-sm">
        Entre para salvar seu historico de paginas processadas
      </p>

      <button
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 rounded border-2 border-ink-line bg-ink-soft py-3 text-paper hover:border-paper/40 transition-colors mb-5"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.55-1.84.86-3.06.86-2.36 0-4.36-1.6-5.07-3.74H.9v2.33A9 9 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.93 10.68A5.4 5.4 0 0 1 3.64 9c0-.58.1-1.15.29-1.68V4.99H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.01l3.03-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.99l3.03 2.33C4.64 5.18 6.64 3.58 9 3.58z"
          />
        </svg>
        Continuar com Google
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-ink-line" />
        <span className="text-xs text-paper/40">OU</span>
        <div className="h-px flex-1 bg-ink-line" />
      </div>

      <div className="flex rounded-full border-2 border-ink-line p-1 mb-6">
        <button
          onClick={() => {
            setMode("signin");
            setError(null);
            setInfo(null);
          }}
          className={`flex-1 rounded-full py-2 text-sm font-display tracking-wide transition-colors ${
            mode === "signin" ? "bg-seal text-ink" : "text-paper/60"
          }`}
        >
          Entrar
        </button>
        <button
          onClick={() => {
            setMode("signup");
            setError(null);
            setInfo(null);
          }}
          className={`flex-1 rounded-full py-2 text-sm font-display tracking-wide transition-colors ${
            mode === "signup" ? "bg-seal text-ink" : "text-paper/60"
          }`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="text-xs uppercase tracking-wide text-paper/50 block mb-1">
              Nome de usuario
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Seu nome de usuario"
              className="w-full rounded border-2 border-ink-line bg-ink-soft px-4 py-3 text-paper placeholder:text-paper/30 focus:border-seal outline-none"
            />
          </div>
        )}

        <div>
          <label className="text-xs uppercase tracking-wide text-paper/50 block mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@exemplo.com"
            className="w-full rounded border-2 border-ink-line bg-ink-soft px-4 py-3 text-paper placeholder:text-paper/30 focus:border-seal outline-none"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-paper/50 block mb-1">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded border-2 border-ink-line bg-ink-soft px-4 py-3 pr-12 text-paper placeholder:text-paper/30 focus:border-seal outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-paper/40 hover:text-paper/70 text-xs"
            >
              {showPassword ? "ocultar" : "ver"}
            </button>
          </div>
        </div>

        {mode === "signup" && (
          <div>
            <label className="text-xs uppercase tracking-wide text-paper/50 block mb-1">
              Confirmar senha
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded border-2 border-ink-line bg-ink-soft px-4 py-3 text-paper placeholder:text-paper/30 focus:border-seal outline-none"
            />
          </div>
        )}

        {mode === "signin" && (
          <button
            type="button"
            onClick={async () => {
              setError(null);
              setInfo(null);
              if (!email) {
                setError("Digite seu email primeiro.");
                return;
              }
              const { error } = await supabase!.auth.resetPasswordForEmail(email, {
                redirectTo: getRedirectUrl(),
              });
              if (error) setError(traduzErro(error.message));
              else setInfo("Enviamos um email para redefinir sua senha.");
            }}
            className="text-xs text-paper/50 hover:text-ukiyo block text-right w-full"
          >
            Esqueceu a senha?
          </button>
        )}

        {error && <p className="text-seal text-sm">{error}</p>}
        {info && <p className="text-ukiyo text-sm">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-seal py-3 font-display text-lg tracking-wide text-ink hover:bg-seal-dim transition-colors disabled:opacity-50"
        >
          {loading
            ? "Enviando..."
            : mode === "signin"
            ? "Entrar"
            : "Criar conta"}
        </button>
      </form>

      <p className="text-paper/40 text-xs text-center mt-6">
        Ao continuar, voce concorda com nossos termos de uso e politica de
        privacidade.
      </p>
    </div>
  );
}
