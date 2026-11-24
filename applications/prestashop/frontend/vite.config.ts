import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import jsxLineSpaces from "./jsx-line-spaces.js";

export default defineConfig({
  // jsx-line-spaces keeps the space a line break between JSX children would have in HTML; see that file.
  plugins: [react({ babel: { plugins: [jsxLineSpaces] } }), tailwindcss()],
  server: { proxy: { "/api": `http://127.0.0.1:${process.env.PORT ?? "3000"}` } },
});
