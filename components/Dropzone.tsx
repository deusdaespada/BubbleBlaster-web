"use client";

import { useRef, useState } from "react";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
}

export default function Dropzone({ onFiles }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`cursor-pointer rounded border-2 border-dashed p-8 text-center transition-colors ${
        dragging ? "border-ukiyo bg-ukiyo/10" : "border-paper/30 hover:border-seal/60"
      }`}
    >
      <svg
        width="48"
        height="40"
        viewBox="0 0 30 26"
        className="mx-auto mb-3 opacity-70"
        aria-hidden="true"
      >
        <path
          d="M2 4c0-1.1.9-2 2-2h22c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H12l-6 6v-6H4c-1.1 0-2-.9-2-2V4z"
          fill="none"
          stroke="#E7E4DA"
          strokeWidth="1.5"
        />
      </svg>
      <p className="font-display text-xl text-paper">Solte uma pagina aqui</p>
      <p className="text-paper/50 text-sm mt-1">
        ou clique para escolher uma ou mais imagens (PNG, JPG)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
