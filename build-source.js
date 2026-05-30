/*
 * build-source.js
 * Regenerates game-src.js, an embedded copy of game.js used as a
 * fallback by the "View source" viewer when fetch() can't reach the
 * file (e.g. when index.html is opened straight from disk on file://).
 *
 * Run after editing game.js:   node build-source.js
 */
const fs = require("fs");

const src = fs.readFileSync("game.js", "utf8");
const out =
  "/* Auto-generated mirror of game.js, used as a fallback for the in-page " +
  "source viewer when fetch() is unavailable (e.g. opening index.html " +
  "directly from disk). Regenerate with: node build-source.js */\n" +
  "window.GAME_SRC = " +
  JSON.stringify(src) +
  ";\n";

fs.writeFileSync("game-src.js", out);
console.log(`game-src.js regenerated (${src.length} chars).`);
