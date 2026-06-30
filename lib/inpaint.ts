import type { TextBox } from "./types";

// Padding em pixels adicionado em volta de cada caixa antes de apagar,
// pra cobrir bordas do texto que o OCR cortou rente.
const BOX_PADDING = 3;

function padded(box: TextBox, width: number, height: number) {
  return {
    x0: Math.max(0, box.x0 - BOX_PADDING),
    y0: Math.max(0, box.y0 - BOX_PADDING),
    x1: Math.min(width, box.x1 + BOX_PADDING),
    y1: Math.min(height, box.y1 + BOX_PADDING),
  };
}

/**
 * Redesenha a imagem original no canvas e preenche as caixas escolhidas
 * com branco solido. Equivalente ao modo "sem CUDA" do BubbleBlaster
 * original (fill_rects).
 */
export function paintFlat(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  boxes: TextBox[]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context indisponivel");

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  ctx.drawImage(image, 0, 0);

  ctx.fillStyle = "#ffffff";
  for (const box of boxes) {
    const p = padded(box, canvas.width, canvas.height);
    ctx.fillRect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
  }
}

let openCvPromise: Promise<any> | null = null;

function loadOpenCv(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OpenCV so pode ser carregado no navegador"));
  }
  const existing = (window as any).cv;
  if (existing && existing.Mat) return Promise.resolve(existing);

  if (openCvPromise) return openCvPromise;

  openCvPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Tempo esgotado carregando o OpenCV.js"));
    }, 25000);

    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;
    script.onload = () => {
      const cv = (window as any).cv;
      if (!cv) {
        clearTimeout(timeout);
        reject(new Error("OpenCV.js carregou mas nao expos window.cv"));
        return;
      }
      cv.onRuntimeInitialized = () => {
        clearTimeout(timeout);
        resolve(cv);
      };
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Falha ao carregar o script do OpenCV.js (CDN bloqueado?)"));
    };
    document.body.appendChild(script);
  });

  return openCvPromise;
}

/**
 * Usa o algoritmo de inpainting TELEA do OpenCV (carregado via WASM no
 * navegador, sob demanda) para reconstruir o fundo sob o texto, em vez de
 * so pintar branco. Equivalente ao modo "inpaint" do BubbleBlaster
 * original, mas roda 100% no cliente - sem precisar de GPU/CUDA.
 */
export async function paintSmart(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  boxes: TextBox[]
) {
  const cv = await loadOpenCv();

  // Garante que o canvas tem a imagem original antes de ler para o OpenCV.
  paintFlat(canvas, image, []);

  const src = cv.imread(canvas);
  const mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);

  for (const box of boxes) {
    const p = padded(box, canvas.width, canvas.height);
    const pt1 = new cv.Point(p.x0, p.y0);
    const pt2 = new cv.Point(p.x1, p.y1);
    cv.rectangle(mask, pt1, pt2, new cv.Scalar(255), -1);
  }

  const dst = new cv.Mat();
  try {
    cv.inpaint(src, mask, dst, 5, cv.INPAINT_TELEA);
    cv.imshow(canvas, dst);
  } finally {
    src.delete();
    mask.delete();
    dst.delete();
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao exportar o canvas"));
    }, "image/png");
  });
}
