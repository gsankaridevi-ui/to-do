#!/usr/bin/env node
/* Bundles index.html + styles.css + app.js into a single portable file:
   planner.html — open it from anywhere, email it, drop it on a USB stick.
   Run: node build.js */

const fs = require("node:fs");
const path = require("node:path");

const dir = __dirname;
const read = name => fs.readFileSync(path.join(dir, name), "utf8");

const html = read("index.html");
const css = read("styles.css");
const js = read("app.js");

const bundled = html
  .replace(
    '<link rel="stylesheet" href="styles.css">',
    "<style>\n" + css.trim() + "\n</style>"
  )
  .replace(
    '<script src="app.js"></script>',
    "<script>\n" + js.trim() + "\n<\/script>"
  )
  .replace(
    "<title>Weekly Planner</title>",
    "<title>Weekly Planner</title>\n<!-- Single-file build. Edit index.html / styles.css / app.js, then run: node build.js -->"
  );

if (bundled.includes('href="styles.css"') || bundled.includes('src="app.js"')) {
  console.error("build failed: the CSS or JS tag in index.html no longer matches build.js");
  process.exit(1);
}

fs.writeFileSync(path.join(dir, "planner.html"), bundled);
console.log("wrote planner.html (" + Math.round(bundled.length / 1024) + " KB)");
