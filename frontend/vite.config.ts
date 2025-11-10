import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true,
    hmr: false, // Disable HMR to prevent reload loops in Replit
    allowedHosts: [
      "88d619a8-d6c4-4eac-9c71-b37d242e37c0-00-21w6tfpinex63.sisko.replit.dev",
      ".replit.dev",
      ".replit.app",
      "localhost"
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
