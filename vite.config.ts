import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// 5274: a loja usa a 5273. strictPort faz o Vite falhar se a porta estiver ocupada,
// em vez de subir em outra e deixar voce achando que abriu o backoffice.
const PORT = Number(process.env.PORT ?? 5274);
// Backend local (NestJS). Em producao o nginx faz este papel.
const API_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:3333";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    host: "0.0.0.0",
    port: PORT,
    strictPort: true,
    // O backend ja serve tudo sob /api: repassa o caminho sem reescrever
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
  preview: { host: "0.0.0.0", port: PORT, strictPort: true },
  build: { outDir: "dist", sourcemap: false },
});
