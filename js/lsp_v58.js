import supabase from "./supabase_client_v58.js";
import { requireSession, wireSignOut } from "./auth_guard_v58.js";
await requireSession(); wireSignOut();
document.getElementById("btnOpenChat")?.addEventListener("click", ()=>window.ClarionChat?.open());
const f=document.getElementById("frmHours");
f?.addEventListener("submit", async e=>{ e.preventDefault(); const fd=new FormData(f); const { data:{ user } }=await supabase.auth.getUser();
  const p={ lsp_id:user?.id, lsp_name:user?.user_metadata?.full_name||"", production:fd.get("production")||"", location:fd.get("location")||"", start_time:fd.get("start_time")||"", finish_time:fd.get("finish_time")||"", allowances:(["meal","car","cell","winter_shelter","travel"].filter(x=>fd.get(x))).join(","), status:"submitted" };
  const { error }=await supabase.from("hours").insert(p); if(error) alert(error.message); else{ alert("Hours submitted."); f.reset(); load(); } });
async function load(){ const t=document.querySelector("#tblMyHours tbody"); if(!t) return; const { data:{ user } }=await supabase.auth.getUser(); const { data, error }=await supabase.from("hours").select("*").eq("lsp_id",user?.id).order("created_at",{ascending:false}).limit(50); if(error){ t.innerHTML=`<tr><td colspan="6">${error.message}</td></tr>`; return; } t.innerHTML=""; (data||[]).forEach(h=>{ const tr=document.createElement("tr"); tr.innerHTML=`<td>${h.production||""}</td><td>${h.location||""}</td><td>${h.start_time||""}</td><td>${h.finish_time||""}</td><td>${h.allowances||""}</td><td>${h.status||""}</td>`; t.appendChild(tr); }); }
document.getElementById("tabMyHours")?.addEventListener("click", load); document.getElementById("tabMyHours")?.click();
