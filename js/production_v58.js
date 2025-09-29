import supabase from "./supabase_client_v58.js";
import { requireSession, wireSignOut } from "./auth_guard_v58.js";
const u=await requireSession("production"); wireSignOut();
document.getElementById("btnOpenChat")?.addEventListener("click", ()=>window.ClarionChat?.open());
const f=document.getElementById("frmOrder");
f?.addEventListener("submit", async e=>{ e.preventDefault(); const fd=new FormData(f); const { data:{ user } }=await supabase.auth.getUser();
  const p={ production:fd.get("production")||(u?.user_metadata?.company||"Production"), location:fd.get("location")||"", call_time:fd.get("call_time")||"", end_time:fd.get("end_time")||"", date:fd.get("date")||null, task_type:fd.get("task_type")||"Road Clearing", lsp_count:Number(fd.get("lsp_count")||"1"), notes:fd.get("notes")||"", status:"new", status_ts:new Date().toISOString(), created_by:user?.id };
  const { error }=await supabase.from("orders").insert(p); if(error) alert(error.message); else{ alert("Order submitted."); f.reset(); load(); } });
async function load(){ const t=document.querySelector("#tblMyOrders tbody"); if(!t) return; const { data:{ user } }=await supabase.auth.getUser(); const { data, error }=await supabase.from("orders").select("*").eq("created_by",user?.id).order("created_at",{ascending:false}).limit(50); if(error){ t.innerHTML=`<tr><td colspan="7">${error.message}</td></tr>`; return; } t.innerHTML=""; (data||[]).forEach(o=>{ const tr=document.createElement("tr"); tr.innerHTML=`<td>${o.production||""}</td><td>${o.location||""}</td><td>${o.date?.slice?.(0,10)||""}</td><td>${o.call_time||""}</td><td>${o.lsp_count||""}</td><td>${o.task_type||""}</td><td>${o.status||"new"}</td>`; t.appendChild(tr); }); }
document.getElementById("tabMyOrders")?.addEventListener("click", load); document.getElementById("tabMyOrders")?.click();
