import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// API_PROXY_TARGET verilirse (ör. canlı backend) /api ve /uploads istekleri dev server
// üzerinden oraya yönlendirilir; böylece tarayıcı aynı origin'e konuşur ve hedef
// backend'in CORS listesinde localhost olmasına gerek kalmaz. Bu durumda
// VITE_API_BASE_URL=/api olmalı.
const proxyTarget = process.env.API_PROXY_TARGET;

const proxyOptions = {
  target: proxyTarget,
  changeOrigin: true,
  // Spring CORS filtresi Origin header'ı görünce localhost'u reddeder; sunucudan
  // sunucuya giden istekte bu header'a gerek yok.
  configure: (proxy: any) => {
    proxy.on("proxyReq", (proxyReq: any) => proxyReq.removeHeader("origin"));
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: proxyTarget
      ? { "/api": proxyOptions, "/uploads": proxyOptions }
      : undefined,
  },
});
