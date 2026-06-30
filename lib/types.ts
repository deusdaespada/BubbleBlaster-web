export interface TextBox {
  id: string;
  text: string;
  confidence: number; // 0..1
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type BlastStatus =
  | "idle"
  | "scanning"
  | "ready"
  | "painting"
  | "done"
  | "error";

export interface BlastImage {
  id: string;
  file: File;
  fileName: string;
  objectUrl: string;
  width: number;
  height: number;
  status: BlastStatus;
  progressLabel: string;
  progress: number; // 0..1
  boxes: TextBox[] | null;
  selected: Set<string>;
  processedDataUrl: string | null;
  rawText: string | null;
  translatedText: string | null;
  error: string | null;
  notice: string | null;
}

export interface BlastSettings {
  languageLabel: string;
  languageCode: string;
  confidence: number;
  smartInpaint: boolean;
  exportRaw: boolean;
  exportTranslated: boolean;
  translateTarget: string;
}
