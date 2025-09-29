// Clarion v60 — Profile Editor (no region/country)
// - Users: edit ONLY their own profile_details row
// - Admin/Manager: search via RPC and edit anyone’s details
// - Every save logged server-side in profile_details_log (editor + timestamp)

import supabase from "./supabase_client_v58.js";
import { OutputPanel } from "./output_panel_v1.js";

const FIELDS = [
  ["display_name","Display Name"],
  ["first_name","First Name"],
  ["last_name","Last Name"],
  ["full_name","Full Name"],
  ["phone","Phone"],
  ["address_line1","Address Line 1"],
  ["address_line2","Address Line 2"],
  ["city","City"],
  ["postal_code","Postal Code"],
];

let CURRENT = {
  role: "lsp",
  selfId: null,
  targetId: null,
  targetEmail: null,
};

async function getRole(){
  try{ const { data } = await supabase.rpc("clarion_self_role"); return (data||"lsp").toLowerCase(); }
  catch{ return "lsp"; }
}
async function getUser(){
  const { data:{ user } } = await supabase.auth.getUser();
  return user || null;
}
function htmlesc(s){
  return String(s??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

function panelShell(extraTop=""){
  return `
    ${extraTop}
    <form id="profileForm" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.6rem">
      ${FIELDS.map(([k,label])=>`
        <label>${label}<br/>
          <input name="${k}" autocomplete="off"/>
        </label>
      `).join("")}
      <div style="grid-column:1/-1;margin-top:.6rem;display:flex;gap:.5rem">
        <button id="btnSaveProfile" class="btn" type="submit">Save Profile</button>
        <button id="btnReloadProfile" class="btn ghost" type="button">Reload</button>
      </div>
    </form>

    <h3 style="margin-top:1rem">Recent Changes</h3>
    <div id="logsArea"><div class="op-muted">Loading…</div></div>
  `;
}

function injectHeaderButton(){
  const right = document.querySelector(".right");
  if (!right || document.getElementById("btnOpenProfile")) return;
  const b = document.createElement("button");
  b.id = "btnOpenProfile";
  b.className = "btn ghost";
  b.type = "button";
  b.textContent = "Profile";
  right.insertBefore(b, right.lastElementChild);
  b.addEventListener("click", openSelfEditor);
}

async function openSelfEditor(){
  const user = await getUser();
  if (!user){
    location.href="/login_basic.html?next="+encodeURIComponent(location.pathname+location.search);
    return;
  }
  CURRENT.targetId = user.id;
  CURRENT.targetEmail = user.email;
  renderEditorUI({ allowPicker: ["admin","manager"].includes(CURRENT.role) });
  await loadAndFill(CURRENT.targetId);
  await loadLogs(CURRENT.targetId);
}

async function openEditorForUser(userId, email){
  CURRENT.targetId = userId;
  CURRENT.targetEmail = email;
  renderEditorUI({ allowPicker: ["admin","manager"].includes(CURRENT.role) });
  await loadAndFill(userId);
  await loadLogs(userId);
}

function renderEditorUI({ allowPicker }){
  const top = allowPicker ? `
  <div style="margin-bottom:.8rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
    <strong>Editing:</strong>
    <span id="whoEmail" class="op-muted">${htmlesc(CURRENT.targetEmail||"me")}</span>
    <span style="flex:1 1 auto"></span>
    <input id="userSearch" placeholder="Find user by email…" style="min-width:240px;display:${allowPicker?"inline-block":"none"}" />
    <button id="btnFindUser" class="btn ghost" type="button" style="display:${allowPicker?"inline-block":"none"}">Load</button>
  </div>` : "";

  OutputPanel.set({ title:"Profile", html: panelShell(top) });

  const form = document.getElementById("profileForm");
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();

    // Only Managers/Admins can edit others; users can edit self
    const user = await getUser();
    const editingOwnRow = user && user.id === CURRENT.targetId;
    if (!editingOwnRow && !["admin","manager"].includes(CURRENT.role)){
      alert("You can only edit your own profile.");
      return;
    }

    const payload = { user_id: CURRENT.targetId };
    FIELDS.forEach(([k])=> payload[k] = form.elements[k]?.value ?? null );

    const { error } = await supabase
      .from("profile_details")
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id")
      .maybeSingle();

    if (error){
      alert("Save failed: " + error.message);
      return;
    }
    await loadLogs(CURRENT.targetId);
  });

  document.getElementById("btnReloadProfile").addEventListener("click", async ()=>{
    await loadAndFill(CURRENT.targetId);
  });

  if (allowPicker){
    document.getElementById("btnFindUser").addEventListener("click", async ()=>{
      const term = (document.getElementById("userSearch").value || "").trim();
      if (!term){ alert("Enter an email fragment."); return; }
      // SAFE search via RPC (no direct SELECT on profiles)
      const { data, error } = await supabase.rpc("manager_search_profiles", { search: term });
      if (error){ alert("Search error: " + error.message); return; }
      if (!data?.length){ alert("No matches."); return; }
      const pick = prompt("Select index:\n" + data.map((r,i)=>`${i+1}. ${r.email}`).join("\n"));
      const idx = Math.max(1, Math.min(data.length, parseInt(pick||"1",10))) - 1;
      const row = data[idx];
      document.getElementById("whoEmail").textContent = row.email;
      await openEditorForUser(row.id, row.email);
    });
  }
}

async function loadAndFill(userId){
  const form = document.getElementById("profileForm");
  if (!form) return;

  // Ensure self row exists on first open
  try{
    const u = await getUser();
    if (u && u.id === userId){
      await supabase.from("profile_details").upsert({ user_id: userId }).select("user_id").maybeSingle();
    }
  }catch{}

  // Fetch details
  const { data, error } = await supabase
    .from("profile_details")
    .select(FIELDS.map(([k])=>k).join(","))
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116"){ // "Results contain 0 rows"
    alert("Load error: " + error.message);
    return;
  }
  FIELDS.forEach(([k])=>{
    const el = form.elements[k];
    if (el) el.value = data?.[k] ?? "";
  });
}

async function loadLogs(userId){
  const wrap = document.getElementById("logsArea");
  if (!wrap) return;
  const { data, error } = await supabase
    .from("profile_details_log")
    .select("ts, editor_email, old_row, new_row")
    .eq("user_id", userId)
    .order("ts", { ascending: false })
    .limit(20);

  if (error){
    wrap.innerHTML = `<div class="op-muted">Log error: ${htmlesc(error.message)}</div>`;
    return;
  }
  if (!data?.length){
    wrap.innerHTML = `<div class="op-muted">No changes yet.</div>`;
    return;
  }

  const rows = data.map(row=>{
    const changed = diffKeys(row.old_row, row.new_row);
    return `
      <tr>
        <td>${new Date(row.ts).toLocaleString()}</td>
        <td>${htmlesc(row.editor_email||"")}</td>
        <td>${changed.length ? htmlesc(changed.join(", ")) : "<span class='op-muted'>all/new</span>"}</td>
        <td><button class="btn ghost" data-view='${htmlesc(JSON.stringify(row))}'>View</button></td>
      </tr>`;
  }).join("");
  wrap.innerHTML = `
    <div style="overflow:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th>When</th><th>Edited By</th><th>Changed Fields</th><th>Diff</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="op-muted" style="margin-top:.4rem">Showing latest 20 changes.</div>
  `;
  wrap.querySelectorAll("button[data-view]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const row = JSON.parse(btn.getAttribute("data-view"));
      showDiffModal(row.old_row, row.new_row);
    });
  });
}

// Helpers for diffs
function diffKeys(a,b){
  const ka = Object.keys(a||{});
  const kb = Object.keys(b||{});
  const ks = new Set([...ka, ...kb]);
  const out = [];
  ks.forEach(k=>{
    const va = JSON.stringify((a||{})[k] ?? null);
    const vb = JSON.stringify((b||{})[k] ?? null);
    if (va !== vb && k !== "updated_at" && k !== "created_at") out.push(k);
  });
  return out;
}
function showDiffModal(oldRow, newRow){
  const pre = (obj)=>htmlesc(JSON.stringify(obj||{}, null, 2));
  const html = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">
      <div><h4>Before</h4><pre style="white-space:pre-wrap">${pre(oldRow)}</pre></div>
      <div><h4>After</h4><pre style="white-space:pre-wrap">${pre(newRow)}</pre></div>
    </div>`;
  OutputPanel.set({ title:"Profile Change – Diff", html });
}

async function init(){
  injectHeaderButton();
  const user = await getUser();
  if (!user) return;
  CURRENT.selfId = user.id;
  CURRENT.role = await getRole();

  // Add a "Profile" card in the grid if missing
  const grid = document.querySelector(".cards");
  if (grid && !grid.querySelector("[data-card='profile']")){
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-card","profile");
    card.innerHTML = `<h3>Profile</h3><p>Edit your display name & details.</p><button class="btn">Open</button>`;
    card.addEventListener("click", openSelfEditor);
    grid.prepend(card);
  }
}
document.addEventListener("DOMContentLoaded", init);
