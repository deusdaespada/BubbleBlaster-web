"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Dropzone from "@/components/Dropzone";
import ImageQueue from "@/components/ImageQueue";
import ControlsPanel from "@/components/ControlsPanel";
import BubbleCanvas from "@/components/BubbleCanvas";
import { runOcr } from "@/lib/ocr";
import { paintFlat, paintSmart, canvasToBlob } from "@/lib/inpaint";
import { boxesToRawText, downloadText, downloadDataUrl } from "@/lib/raw";
import { saveBlastToHistory } from "@/lib/blastHistory";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { LANGUAGES } from "@/lib/languages";
import type { BlastImage, BlastSettings } from "@/lib/types";

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadImageElement(file: File): Promise<{
  el: HTMLImageElement;
  url: string;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => resolve({ el, url, width: el.naturalWidth, height: el.naturalHeight });
    el.onerror = () => reject(new Error("Nao foi possivel carregar a imagem"));
    el.src = url;
  });
}

const DEFAULT_SETTINGS: BlastSettings = {
  languageLabel: LANGUAGES[0].label,
  languageCode: LANGUAGES[0].code,
  confidence: 0.4,
  smartInpaint: false,
  exportRaw: false,
  exportTranslated: false,
  translateTarget: "pt",
};

export default function Home() {
  const [images, setImages] = useState<BlastImage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<BlastSettings>(DEFAULT_SETTINGS);
  const [userId, setUserId] = useState<string | null>(null);
  const [savingHistory, setSavingHistory] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElsRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const active = useMemo(
    () => images.find((img) => img.id === activeId) ?? null,
    [images, activeId]
  );

  const visibleBoxes = useMemo(() => {
    if (!active?.boxes) return [];
    return active.boxes.filter((b) => b.confidence >= settings.confidence);
  }, [active, settings.confidence]);

  function patchImage(id: string, patch: Partial<BlastImage>) {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...patch } : img)));
  }

  async function handleAddFiles(files: File[]) {
    for (const file of files) {
      try {
        const { el, url, width, height } = await loadImageElement(file);
        const id = makeId();
        imageElsRef.current.set(id, el);
        const newImage: BlastImage = {
          id,
          file,
          fileName: file.name,
          objectUrl: url,
          width,
          height,
          status: "idle",
          progressLabel: "",
          progress: 0,
          boxes: null,
          selected: new Set(),
          processedDataUrl: null,
          rawText: null,
          translatedText: null,
          error: null,
          notice: null,
        };
        setImages((prev) => [...prev, newImage]);
        setActiveId((prev) => prev ?? id);
      } catch (err) {
        console.error(err);
      }
    }
  }

  function handleRemove(id: string) {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.objectUrl);
      return prev.filter((img) => img.id !== id);
    });
    imageElsRef.current.delete(id);
    if (activeId === id) {
      setActiveId(null);
    }
  }

  async function handleScan() {
    if (!active) return;
    const el = imageElsRef.current.get(active.id);
    if (!el) return;
    patchImage(active.id, {
      status: "scanning",
      progress: 0,
      progressLabel: "iniciando OCR",
      error: null,
    });
    try {
      const boxes = await runOcr(el, settings.languageCode, (status, progress) => {
        patchImage(active.id, { progressLabel: status, progress });
      });
      patchImage(active.id, {
        boxes,
        status: "ready",
        selected: new Set(),
        processedDataUrl: null,
      });
    } catch (err) {
      patchImage(active.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Erro ao escanear a imagem",
      });
    }
  }

  function toggleBox(id: string) {
    if (!active) return;
    const next = new Set(active.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    patchImage(active.id, { selected: next });
  }

  function selectAll() {
    if (!active) return;
    patchImage(active.id, { selected: new Set(visibleBoxes.map((b) => b.id)) });
  }

  function clearSelection() {
    if (!active) return;
    patchImage(active.id, { selected: new Set() });
  }

  function backToSelection() {
    if (!active) return;
    patchImage(active.id, { status: "ready", processedDataUrl: null, notice: null });
  }

  async function handlePaint(target: "selected" | "all") {
    const canvas = canvasRef.current;
    if (!active || !canvas) return;
    const el = imageElsRef.current.get(active.id);
    if (!el) return;

    const boxesToPaint =
      target === "all" ? visibleBoxes : visibleBoxes.filter((b) => active.selected.has(b.id));

    if (boxesToPaint.length === 0) {
      patchImage(active.id, { error: "Nenhum balao selecionado para apagar." });
      return;
    }

    patchImage(active.id, { status: "painting", error: null, notice: null });

    let notice: string | null = null;
    try {
      if (settings.smartInpaint) {
        try {
          await paintSmart(canvas, el, boxesToPaint);
        } catch (err) {
          console.warn("Smart inpaint indisponivel, usando preenchimento simples", err);
          paintFlat(canvas, el, boxesToPaint);
          notice = "OpenCV nao carregou: usado preenchimento branco simples.";
        }
      } else {
        paintFlat(canvas, el, boxesToPaint);
      }

      const dataUrl = canvas.toDataURL("image/png");

      let rawText: string | null = null;
      let translatedText: string | null = null;

      if (settings.exportRaw || settings.exportTranslated) {
        rawText = boxesToRawText(visibleBoxes);
      }

      if (settings.exportTranslated && rawText) {
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: rawText, target: settings.translateTarget }),
          });
          const data = await res.json();
          translatedText = data.translated ?? null;
        } catch (err) {
          console.warn("Falha na traducao", err);
        }
      }

      patchImage(active.id, {
        status: "done",
        processedDataUrl: dataUrl,
        rawText,
        translatedText,
        notice,
      });
    } catch (err) {
      patchImage(active.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Erro ao remover o texto",
      });
    }
  }

  function handleDownloadImage() {
    if (!active?.processedDataUrl) return;
    const base = active.fileName.replace(/\.[^.]+$/, "");
    downloadDataUrl(`${base}_blasted.png`, active.processedDataUrl);
  }

  function handleDownloadRaw() {
    if (!active?.rawText) return;
    const base = active.fileName.replace(/\.[^.]+$/, "");
    downloadText(`${base}_raw.txt`, active.rawText);
  }

  function handleDownloadTranslated() {
    if (!active?.translatedText) return;
    const base = active.fileName.replace(/\.[^.]+$/, "");
    downloadText(`${base}_translated.txt`, active.translatedText);
  }

  async function handleSaveHistory() {
    const canvas = canvasRef.current;
    if (!active || !userId || !canvas) return;
    setSavingHistory(true);
    setSaveMessage(null);
    try {
      const processedBlob = await canvasToBlob(canvas);
      await saveBlastToHistory({
        userId,
        fileName: active.fileName,
        language: settings.languageLabel,
        confidence: settings.confidence,
        originalBlob: active.file,
        processedBlob,
        rawText: active.rawText,
        translatedText: active.translatedText,
      });
      setSaveMessage("Salvo no historico.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Erro ao salvar no historico");
    } finally {
      setSavingHistory(false);
    }
  }

  const activeImgEl = active ? imageElsRef.current.get(active.id) ?? null : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide">
          Estoura os baloes.
        </h1>
        <p className="text-paper/60 mt-1 max-w-xl">
          Suba uma pagina de manga ou manhwa, escolha o idioma do texto e
          apague os baloes direto no navegador - OCR e remocao rodam no seu
          dispositivo, sem upload pra nenhum servidor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-6">
          <Dropzone onFiles={handleAddFiles} />
          <ImageQueue
            images={images}
            activeId={activeId}
            onSelect={setActiveId}
            onRemove={handleRemove}
          />
          {images.length > 0 && (
            <div className="panel-frame halftone-surface rounded p-4">
              <ControlsPanel settings={settings} onChange={(p) => setSettings((s) => ({ ...s, ...p }))} />
            </div>
          )}
        </aside>

        <section>
          {!active && (
            <div className="panel-frame halftone-surface flex min-h-[420px] items-center justify-center rounded p-10 text-center">
              <p className="text-paper/50 font-display text-2xl">
                Nenhuma pagina carregada ainda
              </p>
            </div>
          )}

          {active && activeImgEl && (
            <div className="panel-frame halftone-surface rounded p-4">
              {active.status === "idle" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <img
                    src={active.objectUrl}
                    alt={active.fileName}
                    className="max-h-[420px] rounded border border-ink-line"
                  />
                  <button
                    onClick={handleScan}
                    className="rounded bg-seal px-6 py-2.5 font-display text-lg tracking-wide text-ink hover:bg-seal-dim transition-colors"
                  >
                    Escanear baloes
                  </button>
                </div>
              )}

              {active.status === "scanning" && (
                <div className="flex flex-col items-center gap-4 py-16">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-ukiyo border-t-transparent" />
                  <p className="font-mono text-sm text-paper/70">
                    {active.progressLabel} · {Math.round(active.progress * 100)}%
                  </p>
                </div>
              )}

              {active.status === "error" && !active.boxes && (
                <div className="py-10 text-center">
                  <p className="text-seal mb-3">{active.error}</p>
                  <button
                    onClick={handleScan}
                    className="rounded border border-paper/30 px-4 py-1.5 text-sm hover:border-seal hover:text-seal"
                  >
                    Tentar de novo
                  </button>
                </div>
              )}

              {/*
                Canvas unico e persistente para ready/painting/done/error-pos-scan.
                Importante: nao desmontar este <BubbleCanvas/> entre esses estados,
                senao o resultado pintado (pixels do canvas) se perde na troca.
              */}
              {active.boxes && (
                <div className={active.status === "done" ? "stamp-press" : undefined}>
                  <div className="overflow-auto rounded border border-ink-line">
                    <BubbleCanvas
                      canvasRef={canvasRef}
                      image={activeImgEl}
                      boxes={visibleBoxes}
                      selected={active.selected}
                      mode={active.status === "done" ? "static" : "overlay"}
                      onToggle={toggleBox}
                    />
                  </div>

                  {(active.status === "ready" || active.status === "painting") && (
                    <>
                      <p className="text-paper/45 text-xs mt-2 font-mono">
                        {visibleBoxes.length} balao(oes) detectado(s) acima da confianca
                        minima · clique para selecionar
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={selectAll}
                          className="rounded border border-paper/30 px-3 py-1.5 text-sm hover:border-ukiyo hover:text-ukiyo transition-colors"
                        >
                          Selecionar tudo
                        </button>
                        <button
                          onClick={clearSelection}
                          className="rounded border border-paper/30 px-3 py-1.5 text-sm hover:border-ukiyo hover:text-ukiyo transition-colors"
                        >
                          Limpar selecao
                        </button>
                        <button
                          onClick={() => handlePaint("selected")}
                          disabled={active.status === "painting"}
                          className="rounded bg-ukiyo px-4 py-1.5 text-sm font-display tracking-wide text-ink hover:bg-ukiyo-dim transition-colors disabled:opacity-50"
                        >
                          Apagar selecionados
                        </button>
                        <button
                          onClick={() => handlePaint("all")}
                          disabled={active.status === "painting"}
                          className="rounded bg-seal px-4 py-1.5 text-sm font-display tracking-wide text-ink hover:bg-seal-dim transition-colors disabled:opacity-50"
                        >
                          Apagar todos
                        </button>
                      </div>
                      {active.status === "painting" && (
                        <p className="mt-3 font-mono text-sm text-paper/60">
                          Estourando baloes...
                        </p>
                      )}
                      {active.error && <p className="mt-3 text-sm text-seal">{active.error}</p>}
                    </>
                  )}

                  {active.status === "done" && (
                    <>
                      {active.notice && (
                        <p className="mt-2 text-xs text-paper/50">{active.notice}</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={handleDownloadImage}
                          className="rounded bg-seal px-4 py-1.5 text-sm font-display tracking-wide text-ink hover:bg-seal-dim transition-colors"
                        >
                          Baixar imagem
                        </button>
                        {active.rawText && (
                          <button
                            onClick={handleDownloadRaw}
                            className="rounded border border-paper/30 px-4 py-1.5 text-sm hover:border-ukiyo hover:text-ukiyo transition-colors"
                          >
                            Baixar texto bruto
                          </button>
                        )}
                        {active.translatedText && (
                          <button
                            onClick={handleDownloadTranslated}
                            className="rounded border border-paper/30 px-4 py-1.5 text-sm hover:border-ukiyo hover:text-ukiyo transition-colors"
                          >
                            Baixar traducao
                          </button>
                        )}
                        <button
                          onClick={backToSelection}
                          className="rounded border border-paper/30 px-4 py-1.5 text-sm hover:border-seal hover:text-seal transition-colors"
                        >
                          Refazer selecao
                        </button>
                        {isSupabaseConfigured && userId && (
                          <button
                            onClick={handleSaveHistory}
                            disabled={savingHistory}
                            className="rounded border border-ukiyo px-4 py-1.5 text-sm text-ukiyo hover:bg-ukiyo hover:text-ink transition-colors disabled:opacity-50"
                          >
                            {savingHistory ? "Salvando..." : "Salvar no historico"}
                          </button>
                        )}
                      </div>
                      {saveMessage && (
                        <p className="mt-2 text-sm text-paper/60">{saveMessage}</p>
                      )}
                    </>
                  )}

                  {active.status === "error" && active.boxes && (
                    <p className="mt-3 text-sm text-seal">{active.error}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
