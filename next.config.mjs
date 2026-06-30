/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // CSP removido temporariamente para diagnostico. Um Content-Security-Policy
  // mal configurado pode bloquear o download do worker/WASM do Tesseract.js
  // de forma silenciosa, aparecendo so como "Failed to fetch" sem nenhum
  // detalhe no console - exatamente o sintoma que estavamos vendo. Depois
  // que confirmarmos que o OCR funciona sem CSP, podemos reativar uma
  // policy mais restrita com seguranca.
};

export default nextConfig;
