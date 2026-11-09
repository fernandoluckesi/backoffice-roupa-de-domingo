import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // .env, .env.local etc. (o Vite nao injeta essas variaveis no process.env do config sozinho)
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };

  // 5274: a loja usa a 5273. strictPort faz o Vite falhar se a porta estiver ocupada,
  // em vez de subir em outra e deixar voce achando que abriu o backoffice.
  const port = Number(env.PORT ?? 5274);
  // Backend para onde o /api e repassado: local (NestJS) por padrao. Em producao o nginx faz este papel.
  // Para usar a API de producao localmente: API_PROXY_TARGET no .env.local (ver .env.example).
  const apiTarget = env.API_PROXY_TARGET ?? "http://localhost:3333";

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      host: "0.0.0.0",
      port,
      strictPort: true,
      // O backend ja serve tudo sob /api: repassa o caminho sem reescrever
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true, secure: true },
      },
    },
    preview: { host: "0.0.0.0", port, strictPort: true },
    build: { outDir: "dist", sourcemap: false },
  };
});
