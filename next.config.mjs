/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Content-Security-Policy para permitir que o Tesseract.js carregue o
  // worker e o WASM do jsDelivr, e o OpenCV.js do docs.opencv.org.
  // Sem isso, navegadores modernos com CSP estrita bloqueiam o fetch e o
  // eval() interno do Worker, gerando exatamente o "Failed to fetch".
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: o proprio site + workers do jsDelivr + OpenCV CDN
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://docs.opencv.org",
              // Workers precisam de blob: para o Web Worker do Tesseract
              "worker-src 'self' blob: https://cdn.jsdelivr.net",
              // WASM e arquivos de modelo de idioma
              "connect-src 'self' https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://raw.githubusercontent.com https://translate.googleapis.com https://*.supabase.co",
              // WASM precisa de wasm-unsafe-eval
              "script-src-attr 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' blob: data: https://*.supabase.co",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
