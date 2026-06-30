"use client";

import { LANGUAGES, TRANSLATE_TARGETS } from "@/lib/languages";
import type { BlastSettings } from "@/lib/types";

interface ControlsPanelProps {
  settings: BlastSettings;
  onChange: (next: Partial<BlastSettings>) => void;
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1.5 text-left"
    >
      <span className="text-sm text-paper/85">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-ukiyo" : "bg-ink-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export default function ControlsPanel({ settings, onChange }: ControlsPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="font-display text-sm tracking-wide text-paper/90 block mb-2">
          Idioma do texto
        </label>
        <select
          value={settings.languageCode}
          onChange={(e) => {
            const lang = LANGUAGES.find((l) => l.code === e.target.value);
            if (lang) onChange({ languageCode: lang.code, languageLabel: lang.label });
          }}
          className="w-full rounded border-2 border-ink-line bg-ink-soft px-3 py-2 text-paper outline-none focus:border-seal"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="font-display text-sm tracking-wide text-paper/90 block mb-2">
          Confianca minima: <span className="font-mono">{settings.confidence.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.confidence}
          onChange={(e) => onChange({ confidence: parseFloat(e.target.value) })}
          className="w-full"
        />
        <p className="text-xs text-paper/45 mt-1">
          Mais alto = so texto que o OCR tem certeza que e o idioma escolhido.
          Mais baixo = pega mais texto, mas tambem mais ruido.
        </p>
      </div>

      <div className="border-t border-ink-line pt-4 space-y-1">
        <Switch
          label="Inpaint inteligente (TELEA, sem GPU)"
          checked={settings.smartInpaint}
          onChange={(v) => onChange({ smartInpaint: v })}
        />
        <Switch
          label="Exportar texto bruto (.txt)"
          checked={settings.exportRaw}
          onChange={(v) => onChange({ exportRaw: v })}
        />
        <Switch
          label="Exportar texto traduzido (.txt)"
          checked={settings.exportTranslated}
          onChange={(v) => onChange({ exportTranslated: v })}
        />
      </div>

      {settings.exportTranslated && (
        <div>
          <label className="font-display text-sm tracking-wide text-paper/90 block mb-2">
            Traduzir para
          </label>
          <select
            value={settings.translateTarget}
            onChange={(e) => onChange({ translateTarget: e.target.value })}
            className="w-full rounded border-2 border-ink-line bg-ink-soft px-3 py-2 text-paper outline-none focus:border-seal"
          >
            {TRANSLATE_TARGETS.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
