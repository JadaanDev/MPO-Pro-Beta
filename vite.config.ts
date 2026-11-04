import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 15421,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: "es2021",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, "/");
          if (norm.includes("sucrase")) return "compiler-sucrase";
          if (norm.includes("node_modules/lucide-react")) return "vendor-icons";
          if (norm.includes("node_modules/motion")) return "vendor-motion";
          if (norm.includes("node_modules/react") || norm.includes("node_modules/react-dom")) return "vendor-react";
          if (norm.includes("/src/theme-sdk") || norm.includes("/src/big-studio")) return "studio-creators";
          if (norm.includes("/src/components/dashboard/DesktopHudStudio") || norm.includes("desktop/elements")) return "studio-desktop";
          if (norm.includes("/src/components/dashboard/OverlayStudio")) return "studio-obs";
          if (norm.includes("/src/components/dashboard/SystemSettings") || norm.includes("settings/")) return "studio-settings";
        },
      },
    },
  },
});

