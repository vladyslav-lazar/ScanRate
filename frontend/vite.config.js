import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        host: "0.0.0.0",
        port: 5173,
        proxy: {
            "/api": {
                target:      "http://backend:8000",
                changeOrigin: true,
                rewrite:     (path) => path.replace(/^\/api/, ""),
            },
        },
    },
    preview: {
        host: "0.0.0.0",
        port: 4173,
    },
    build: {
        outDir:     "dist",
        sourcemap:  false,
        rollupOptions: {
            output: {
                manualChunks: {
                    react:   ["react", "react-dom"],
                    router:  ["react-router-dom"],
                    zxing:   ["@zxing/library"],
                },
            },
        },
    },
});