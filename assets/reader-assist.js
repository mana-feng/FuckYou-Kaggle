/* Recovery notes are authored in Markdown (or frozen HTML), never generated
 * by slicing reader text. Keep this URL for existing frozen pages. */
(function () {
  "use strict";

  function addStyles() {
    var style = document.createElement("style");
    style.textContent = [
      ".reader-rescue{margin:1em 0 1.45em;padding:1em 1.15em 1.1em;border:1px solid var(--border);border-left:5px solid var(--accent);border-radius:0 12px 12px 0;background:var(--card);box-shadow:var(--shadow);}",
      ".reader-rescue-intro{margin:0 0 .45em;font-weight:700;color:var(--accent);}",
      ".reader-rescue ol{margin:.2em 0 0;padding-left:1.55em;}",
      ".reader-rescue li{margin:.45em 0;padding-left:.25em;line-height:1.8;}",
      ".reader-rescue li::marker{font-weight:700;color:var(--accent);}",
      "@media (max-width:640px){.reader-rescue{padding:.85em .9em}.reader-rescue li{margin:.6em 0;line-height:1.9;}}"
    ].join("");
    document.head.appendChild(style);
  }

  function run() {
    addStyles();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
