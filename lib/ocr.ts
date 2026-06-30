import type { TextBox } from "./types";

export type OcrProgressCallback = (status: string, progress: number) => void;

interface RawWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

// Tenta extrair "linhas" (equivalente ao bloco de texto que o EasyOCR
// detecta por balao) a partir do retorno do tesseract.js. Diferentes
// versoes da lib expoem isso em data.blocks[].paragraphs[].lines[],
// em data.lines, ou apenas em data.words - por isso o fallback em cascata.
function extractLines(data: any): TextBox[] {
  const lines: TextBox[] = [];

  const pushLine = (text: string, confidence: number, bbox: any, idx: number) => {
    if (!text || !text.trim()) return;
    if (!bbox) return;
    lines.push({
      id: `line-${idx}-${lines.length}`,
      text: text.trim(),
      confidence: (confidence ?? 0) / 100,
      x0: bbox.x0,
      y0: bbox.y0,
      x1: bbox.x1,
      y1: bbox.y1,
    });
  };

  if (Array.isArray(data?.blocks) && data.blocks.length > 0) {
    let i = 0;
    for (const block of data.blocks) {
      const paragraphs = block.paragraphs ?? [];
      for (const para of paragraphs) {
        const paraLines = para.lines ?? [];
        for (const line of paraLines) {
          pushLine(line.text, line.confidence, line.bbox, i++);
        }
      }
    }
    if (lines.length > 0) return lines;
  }

  if (Array.isArray(data?.lines) && data.lines.length > 0) {
    data.lines.forEach((line: any, idx: number) => {
      pushLine(line.text, line.confidence, line.bbox, idx);
    });
    if (lines.length > 0) return lines;
  }

  // Fallback final: agrupa palavras em "linhas" por proximidade vertical,
  // parecido com a logica de interseccao usada no util.py original.
  if (Array.isArray(data?.words) && data.words.length > 0) {
    const words: RawWord[] = data.words
      .filter((w: any) => w.text && w.text.trim())
      .map((w: any) => ({ text: w.text, confidence: w.confidence ?? 0, bbox: w.bbox }));

    words.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);

    const used = new Array(words.length).fill(false);
    let idx = 0;
    for (let i = 0; i < words.length; i++) {
      if (used[i]) continue;
      const group: RawWord[] = [words[i]];
      used[i] = true;
      const height = words[i].bbox.y1 - words[i].bbox.y0;
      for (let j = i + 1; j < words.length; j++) {
        if (used[j]) continue;
        const sameLine =
          Math.abs(words[j].bbox.y0 - words[i].bbox.y0) < height * 0.6;
        if (sameLine) {
          group.push(words[j]);
          used[j] = true;
        }
      }
      group.sort((a, b) => a.bbox.x0 - b.bbox.x0);
      const text = group.map((w) => w.text).join(" ");
      const avgConfidence =
        group.reduce((sum, w) => sum + w.confidence, 0) / group.length;
      const bbox = {
        x0: Math.min(...group.map((w) => w.bbox.x0)),
        y0: Math.min(...group.map((w) => w.bbox.y0)),
        x1: Math.max(...group.map((w) => w.bbox.x1)),
        y1: Math.max(...group.map((w) => w.bbox.y1)),
      };
      pushLine(text, avgConfidence, bbox, idx++);
    }
  }

  return lines;
}

export async function runOcr(
  source: HTMLCanvasElement | HTMLImageElement,
  languageCode: string,
  onProgress?: OcrProgressCallback
): Promise<TextBox[]> {
  // Import dinamico: tesseract.js so deve rodar no navegador. Importar no
  // topo do arquivo faria o Next.js tentar carrega-lo durante o build/SSR
  // (esta pagina e "use client", mas ainda passa por renderizacao no
  // servidor), o que quebraria o build.
  const { createWorker } = await import("tesseract.js");

  const worker = await (createWorker as any)(languageCode, 1, {
    logger: (m: any) => {
      if (onProgress && m?.status) {
        onProgress(m.status, typeof m.progress === "number" ? m.progress : 0);
      }
    },
  });

  try {
    // Cast para "any": diferentes versoes do tesseract.js tem assinaturas de
    // tipos levemente diferentes para o 3o argumento (outputFormats). Isso
    // evita que uma divergencia de versao quebre o build por tipagem,
    // mantendo o comportamento em tempo de execucao.
    const result = await (worker.recognize as any)(
      source,
      {},
      { blocks: true, text: true }
    );
    return extractLines(result.data);
  } finally {
    await worker.terminate();
  }
}
