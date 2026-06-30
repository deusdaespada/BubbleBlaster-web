import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Endpoint publico e nao-oficial do Google Tradutor (o mesmo truque usado
// por libs como deep-translator no projeto Python original). Tem limite de
// uso e pode mudar sem aviso - para producao com volume alto, troque por
// uma API de traducao paga (Google Cloud Translation, DeepL, etc) aqui.
async function translateChunk(text: string, target: string): Promise<string> {
  const url =
    "https://translate.googleapis.com/translate_a/single" +
    `?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha na traducao (status ${res.status})`);
  }
  const data = await res.json();
  const segments = data?.[0] ?? [];
  return segments.map((segment: any) => segment?.[0] ?? "").join("");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = body?.text ?? "";
    const target: string = body?.target ?? "pt";

    if (!text.trim()) {
      return NextResponse.json({ translated: "" });
    }

    // O endpoint publico tem limite de tamanho por requisicao, entao
    // quebramos textos longos em pedacos por linha.
    const lines = text.split("\n");
    const chunks: string[] = [];
    let current = "";
    for (const line of lines) {
      if ((current + "\n" + line).length > 1500) {
        chunks.push(current);
        current = line;
      } else {
        current = current ? `${current}\n${line}` : line;
      }
    }
    if (current) chunks.push(current);

    const translatedChunks = await Promise.all(
      chunks.map((chunk) => translateChunk(chunk, target))
    );

    return NextResponse.json({ translated: translatedChunks.join("\n") });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
