import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { copyFileSync } from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // PDF.js worker를 public 폴더로 복사
    {
      name: 'copy-pdf-worker',
      buildStart() {
        try {
          copyFileSync(
            path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.js'),
            path.resolve(__dirname, 'public/pdf.worker.min.js')
          );
          console.log('PDF worker copied to public folder');
        } catch (error) {
          console.warn('Could not copy PDF worker:', error);
        }
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
