"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BlastRecord,
  deleteBlastRecord,
  getSignedUrl,
  listBlastHistory,
} from "@/lib/blastHistory";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

interface RecordWithUrls extends BlastRecord {
  originalUrl: string | null;
  processedUrl: string | null;
}

export default function HistoryPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [records, setRecords] = useState<RecordWithUrls[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSignedIn(false);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const isSignedIn = Boolean(data.session?.user);
      setSignedIn(isSignedIn);
      if (!isSignedIn) {
        setLoading(false);
        return;
      }
      await loadHistory();
    });
  }, []);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const data = await listBlastHistory();
      const withUrls = await Promise.all(
        data.map(async (record) => ({
          ...record,
          originalUrl: await getSignedUrl(record.original_path),
          processedUrl: await getSignedUrl(record.processed_path),
        }))
      );
      setRecords(withUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar historico");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(record: BlastRecord) {
    try {
      await deleteBlastRecord(record);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-3xl mb-3">Sem historico</h1>
        <p className="text-paper/70">
          Configure o Supabase (veja o README) para guardar suas paginas
          processadas aqui.
        </p>
      </div>
    );
  }

  if (signedIn === false) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-3xl mb-3">Entre para ver seu historico</h1>
        <Link
          href="/login"
          className="inline-block mt-4 rounded bg-seal px-5 py-2 font-display text-ink"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl mb-6">Historico</h1>

      {loading && <p className="text-paper/60 font-mono text-sm">Carregando...</p>}
      {error && <p className="text-seal text-sm mb-4">{error}</p>}

      {!loading && records.length === 0 && (
        <p className="text-paper/60">
          Nenhuma pagina salva ainda. Processe uma imagem no{" "}
          <Link href="/" className="text-ukiyo underline">
            Blaster
          </Link>{" "}
          e clique em &quot;Salvar no historico&quot;.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {records.map((record) => (
          <div key={record.id} className="panel-frame halftone-surface rounded p-3">
            <div className="grid grid-cols-2 gap-1">
              {record.originalUrl && (
                <img
                  src={record.originalUrl}
                  alt="Original"
                  className="aspect-square w-full object-cover rounded-sm border border-ink-line"
                />
              )}
              {record.processedUrl && (
                <img
                  src={record.processedUrl}
                  alt="Processada"
                  className="aspect-square w-full object-cover rounded-sm border border-ink-line"
                />
              )}
            </div>
            <p className="mt-2 truncate text-sm text-paper">{record.file_name}</p>
            <p className="text-xs text-paper/50 font-mono">
              {record.language} · conf {record.confidence.toFixed(2)} ·{" "}
              {new Date(record.created_at).toLocaleDateString("pt-BR")}
            </p>
            <button
              onClick={() => handleDelete(record)}
              className="mt-2 text-xs text-seal hover:text-seal-dim"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
