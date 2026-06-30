"use client";

import { useEffect } from "react";
import type { TextBox } from "@/lib/types";

interface BubbleCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  image: HTMLImageElement;
  boxes: TextBox[];
  selected: Set<string>;
  mode: "overlay" | "static";
  onToggle: (id: string) => void;
}

export default function BubbleCanvas({
  canvasRef,
  image,
  boxes,
  selected,
  mode,
  onToggle,
}: BubbleCanvasProps) {
  useEffect(() => {
    if (mode !== "overlay") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);

    for (const box of boxes) {
      const isSelected = selected.has(box.id);
      const w = box.x1 - box.x0;
      const h = box.y1 - box.y0;

      if (isSelected) {
        ctx.save();
        ctx.fillStyle = "rgba(231, 228, 218, 0.78)";
        ctx.fillRect(box.x0, box.y0, w, h);
        ctx.fillStyle = "rgba(63, 169, 160, 0.35)";
        for (let y = box.y0; y < box.y1; y += 6) {
          for (let x = box.x0; x < box.x1; x += 6) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isSelected ? "#3FA9A0" : "#E2402B";
      ctx.strokeRect(box.x0, box.y0, w, h);

      ctx.font = "12px monospace";
      const label = box.confidence.toFixed(2);
      const labelWidth = ctx.measureText(label).width + 6;
      ctx.fillStyle = isSelected ? "#3FA9A0" : "#E2402B";
      ctx.fillRect(box.x0, Math.max(0, box.y0 - 16), labelWidth, 16);
      ctx.fillStyle = "#15130F";
      ctx.fillText(label, box.x0 + 3, Math.max(12, box.y0 - 4));
    }
  }, [canvasRef, image, boxes, selected, mode]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (mode !== "overlay") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (let i = boxes.length - 1; i >= 0; i--) {
      const box = boxes[i];
      if (x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1) {
        onToggle(box.id);
        break;
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className={`max-w-full ${mode === "overlay" ? "cursor-pointer" : ""}`}
    />
  );
}
