"use client";

import type { BlastImage } from "@/lib/types";

interface ImageQueueProps {
  images: BlastImage[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

const STATUS_LABEL: Record<BlastImage["status"], string> = {
  idle: "pronto p/ escanear",
  scanning: "escaneando...",
  ready: "balões detectados",
  painting: "removendo texto...",
  done: "concluido",
  error: "erro",
};

const STATUS_COLOR: Record<BlastImage["status"], string> = {
  idle: "bg-paper/40",
  scanning: "bg-ukiyo animate-pulse",
  ready: "bg-ukiyo",
  painting: "bg-seal animate-pulse",
  done: "bg-seal",
  error: "bg-seal",
};

export default function ImageQueue({
  images,
  activeId,
  onSelect,
  onRemove,
}: ImageQueueProps) {
  if (images.length === 0) return null;

  return (
    <ul className="space-y-2">
      {images.map((img) => (
        <li key={img.id}>
          <button
            onClick={() => onSelect(img.id)}
            className={`w-full flex items-center gap-3 rounded border-2 p-2 text-left transition-colors ${
              img.id === activeId
                ? "border-seal bg-ink-soft"
                : "border-ink-line hover:border-paper/30"
            }`}
          >
            <img
              src={img.objectUrl}
              alt={img.fileName}
              className="h-12 w-12 rounded-sm object-cover border border-ink-line shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-paper">{img.fileName}</span>
              <span className="flex items-center gap-1.5 text-xs text-paper/50">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLOR[img.status]}`} />
                {STATUS_LABEL[img.status]}
              </span>
            </span>
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(img.id);
              }}
              className="text-paper/30 hover:text-seal shrink-0 px-1 text-lg leading-none"
              title="Remover"
            >
              ×
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
