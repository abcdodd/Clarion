// Output Panel controller (keeps your existing palette and card style)
export const OutputPanel = {
  el: null,
  ensure(){
    if (this.el) return this.el;

    // Try to find an existing panel on the page first
    this.el = document.querySelector("#clarionOutputPanel");
    if (!this.el){
      // Create one if it's not in the HTML
      const sec = document.createElement("section");
      sec.id = "clarionOutputPanel";
      sec.className = "card card--output";
      sec.style.display = "none";
      sec.innerHTML = `<h3 id="opTitle">Output</h3><div id="opBody" style="min-height:140px"></div>`;

      const wrap = document.querySelector("main.wrap") || document.body;
      wrap.appendChild(sec);
      this.el = sec;
    }
    return this.el;
  },
  set({ title, html }){
    const el = this.ensure();
    el.style.display = "";
    const t = el.querySelector("#opTitle");
    const b = el.querySelector("#opBody");
    if (t) t.textContent = title || "Output";
    if (b) b.innerHTML = html || "";
    el.scrollIntoView({ behavior: "smooth", block: "end" });
  },
  clear(){
    const el = this.ensure();
    const b = el.querySelector("#opBody");
    if (b) b.innerHTML = "";
  }
};

// Tiny CSS touch-up for the output panel (uses your brand colors)
(function(){
  const style = document.createElement("style");
  style.textContent = `
    .card--output{ margin-top:1.2rem; border:2px dashed #FF6700 }
    .op-muted{ opacity:.85; font-size:.9rem }
  `;
  document.head.appendChild(style);
})();
