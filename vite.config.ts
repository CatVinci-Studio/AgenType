import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  const isPages = process.env.GITHUB_PAGES === "true";
  return {
    base: isPages ? "/AgenType/" : "/",
    plugins: [react()],
    server: {
      port: 1420,
      strictPort: true,
    },
  };
});
