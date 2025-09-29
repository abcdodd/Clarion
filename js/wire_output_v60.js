// Moves dashboard card actions into the bottom Output Panel (Chat excluded)
import { OutputPanel } from "./output_panel_v1.js";

function textOf(h){ return (h?.textContent || "").trim().toLowerCase(); }

// Example: rehome the LSP Submit Hours form/table into the panel when clicked
function renderSubmitHours(){
  const form = document.querySelector("#frmHours");
  const table = document.querySelector("#tblMyHours")?.closest("table") || document.querySelector("#tblMyHours");
  if (!form && !table){
    OutputPanel.set({ title:"Submit Hours", html:`<p class="op-muted">Form not found on this page.</p>`}); 
    return;
  }
  const panel = OutputPanel.ensure();
  const body  = panel.querySelector("#opBody");
  const title = panel.querySelector("#opTitle");
  if (title) title.textContent = "Submit Hours";

  // Move live DOM nodes so existing page JS continues to work
  body.innerHTML = "";
  if (form) body.appendChild(form);
  if (table){
    const h3 = document.createElement("h3");
    h3.textContent = "Recent Submissions";
    body.appendChild(h3);
    body.appendChild(table);
  }
  panel.style.display = "";
  panel.scrollIntoView({ behavior: "smooth", block: "end" });
}

function bindCards(){
  const cards = document.querySelectorAll(".cards .card");
  cards.forEach(card=>{
    const h = card.querySelector("h3");
    if(!h) return;
    const label = textOf(h);

    // Chat is the single exception — leave as-is
    if (label.includes("clarion call")) return;

    // Pointer affordance
    card.style.cursor = "pointer";

    // Generic behavior: show a placeholder into the panel
    card.addEventListener("click", ()=>{
      if (label.includes("submit hours")) { renderSubmitHours(); return; }
      OutputPanel.set({
        title: h.textContent || "Details",
        html: `<p class="op-muted">Panel view for “${h.textContent || ""}”.</p>`
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  OutputPanel.ensure();
  bindCards();
});
