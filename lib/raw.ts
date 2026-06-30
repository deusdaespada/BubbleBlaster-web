import type { TextBox } from "./types";

function intersects(a: TextBox, b: TextBox) {
  return !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);
}

/**
 * Junta o texto das caixas detectadas em uma unica string, quebrando linha
 * quando duas caixas consecutivas nao se sobrepoem - mesma heuristica do
 * util.py original (exportRaw / intersect).
 */
export function boxesToRawText(boxes: TextBox[]): string {
  let result = "";
  boxes.forEach((box, index) => {
    if (index === 0) {
      result += box.text;
      return;
    }
    const prev = boxes[index - 1];
    result += intersects(box, prev) ? box.text : `\n${box.text}`;
  });
  return result;
}

export function downloadText(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(fileName: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
