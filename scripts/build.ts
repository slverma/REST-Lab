import { build, type InlineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWatch = process.argv.includes("--watch");
const isProd = process.env.NODE_ENV === "production";

// Extension build config (Node.js/CommonJS for VS Code)
const extensionConfig: InlineConfig = {
  configFile: false,
  root: rootDir,
  build: {
    lib: {
      entry: resolve(rootDir, "src/extension.ts"),
      formats: ["cjs"],
      fileName: () => "extension.js",
    },
    outDir: "dist",
    sourcemap: true,
    ssr: true,
    rollupOptions: {
      external: [
        "vscode",
        "path",
        "fs",
        "http",
        "https",
        "url",
        "stream",
        "zlib",
        "util",
        "events",
        "buffer",
        "querystring",
        "crypto",
        "os",
        "net",
        "tls",
        "assert",
      ],
    },
    minify: isProd ? "esbuild" : false,
    emptyOutDir: true,
    watch: isWatch ? {} : null,
  },
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      isProd ? "production" : "development",
    ),
  },
  logLevel: "warn",
};

// Webview build config (browser/IIFE for webviews)
const createWebviewConfig = (
  name: string,
  format: "iife" | "es" = "iife",
): InlineConfig => ({
  configFile: false,
  root: rootDir,
  plugins: [
    react({
      jsxRuntime: "classic",
    }),
  ],
  build: {
    lib: {
      entry: resolve(rootDir, `src/webview/${name}/index.tsx`),
      formats: [format],
      fileName: () => "index.js",
      name: name.charAt(0).toUpperCase() + name.slice(1),
    },
    outDir: `dist/${name}`,
    sourcemap: true,
    minify: isProd ? "esbuild" : false,
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "index.css";
          }
          return "assets/[name]-[hash][extname]";
        },
        inlineDynamicImports: format === "iife",
      },
    },
    watch: isWatch ? {} : null,
  },
  css: {
    postcss: resolve(rootDir, "postcss.config.js"),
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      isProd ? "production" : "development",
    ),
  },
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
    },
  },
  worker: {
    format: "iife",
    plugins: () => [],
  },
  logLevel: "warn",
});

// Build all targets
async function buildAll() {
  const startTime = Date.now();

  if (isWatch) {
    console.log("🔄 Building in watch mode...\n");
  }

  // Build extension first (it clears outDir)
  console.log("📦 Building extension...");
  await build(extensionConfig);

  // Build all webviews in parallel
  console.log("📦 Building webviews in parallel...");
  await Promise.all([
    build(createWebviewConfig("sidebar")),
    build(createWebviewConfig("editor")),
    build(createWebviewConfig("request")),
  ]);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Build complete in ${elapsed}s`);

  if (isWatch) {
    console.log("👀 Watching for changes...");
  }
}

// Run build
buildAll().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
