import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const result = await build({
  entryPoints: [join(__dirname, "src/main.ts")],
  bundle: true,
  format: "iife",
  target: "es2020",
  write: false,
  minify: process.env.NODE_ENV === "production",
});

// The HTML parser ends a <script> block on the literal byte sequence
// "</script", even inside a JS string - escape defensively regardless of
// bundle contents, cheap insurance against exactly the bug this bit
// context-health-check's web-demo before it shipped.
const bundledJs = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const template = readFileSync(join(__dirname, "index.html"), "utf8");
const output = template.replace("<!-- BUILD:INJECT_BUNDLE -->", `<script>\n${bundledJs}\n</script>`);

mkdirSync(join(__dirname, "dist"), { recursive: true });
writeFileSync(join(__dirname, "dist/index.html"), output);

console.log("Built packages/web-demo/dist/index.html - a single, dependency-free static file.");
