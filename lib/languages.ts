export interface LanguageOption {
  label: string;
  code: string;
}

// Tesseract.js usa os codigos de 3 letras do Tesseract (nao os do EasyOCR),
// mas cobrem o mesmo conjunto de idiomas do BubbleBlaster original.
export const LANGUAGES: LanguageOption[] = [
  { label: "Coreano", code: "kor" },
  { label: "Japones", code: "jpn" },
  { label: "Chines Simplificado", code: "chi_sim" },
  { label: "Chines Tradicional", code: "chi_tra" },
  { label: "Ingles", code: "eng" },
  { label: "Russo", code: "rus" },
  { label: "Espanhol", code: "spa" },
  { label: "Italiano", code: "ita" },
  { label: "Portugues", code: "por" },
];

export const TRANSLATE_TARGETS: LanguageOption[] = [
  { label: "Portugues", code: "pt" },
  { label: "Ingles", code: "en" },
  { label: "Espanhol", code: "es" },
  { label: "Japones", code: "ja" },
  { label: "Coreano", code: "ko" },
  { label: "Chines (simplificado)", code: "zh-CN" },
  { label: "Frances", code: "fr" },
  { label: "Alemao", code: "de" },
  { label: "Italiano", code: "it" },
  { label: "Russo", code: "ru" },
];
