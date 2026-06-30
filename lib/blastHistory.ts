import { supabase, SUPABASE_BUCKET } from "./supabaseClient";

export interface BlastRecord {
  id: string;
  file_name: string;
  language: string;
  confidence: number;
  original_path: string;
  processed_path: string;
  raw_text: string | null;
  translated_text: string | null;
  created_at: string;
}

export async function saveBlastToHistory(params: {
  userId: string;
  fileName: string;
  language: string;
  confidence: number;
  originalBlob: Blob;
  processedBlob: Blob;
  rawText: string | null;
  translatedText: string | null;
}) {
  if (!supabase) throw new Error("Supabase nao esta configurado");

  const stamp = Date.now();
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const originalPath = `${params.userId}/${stamp}_original_${safeName}`;
  const processedPath = `${params.userId}/${stamp}_processed_${safeName}`;

  const { error: origErr } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(originalPath, params.originalBlob, { contentType: "image/png" });
  if (origErr) throw origErr;

  const { error: procErr } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(processedPath, params.processedBlob, { contentType: "image/png" });
  if (procErr) throw procErr;

  const { error: insertErr } = await supabase.from("blasts").insert({
    user_id: params.userId,
    file_name: params.fileName,
    language: params.language,
    confidence: params.confidence,
    original_path: originalPath,
    processed_path: processedPath,
    raw_text: params.rawText,
    translated_text: params.translatedText,
  });
  if (insertErr) throw insertErr;
}

export async function listBlastHistory(): Promise<BlastRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("blasts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as BlastRecord[];
}

export async function getSignedUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteBlastRecord(record: BlastRecord) {
  if (!supabase) throw new Error("Supabase nao esta configurado");
  await supabase.storage
    .from(SUPABASE_BUCKET)
    .remove([record.original_path, record.processed_path]);
  const { error } = await supabase.from("blasts").delete().eq("id", record.id);
  if (error) throw error;
}
