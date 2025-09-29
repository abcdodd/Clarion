import supabase from "./supabase_client_v58.js";
const css=`.cL{position:fixed;right:16px;bottom:16px;z-index:9999;width:56px;height:56px;border-radius:999px;background:#FF6700;color:#fff;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,.35),0 0 0 2px #fff;cursor:pointer}
.cP{position:fixed;right:16px;bottom:80px;z-index:9999;width:min(360px,92vw);height:480px;background:#2a2f36;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);display:none;grid-template-rows:auto 1fr auto;overflow:hidden}
.cH{display:flex;justify-content:space-between;align-items:center;padding:.6rem .7rem;background:rgba(255,255,255,.06)}
.cB{padding:.5rem;overflow:auto;display:grid;gap:.4rem;background:rgba(0,0,0,.2)}
.b{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:.45rem .6rem;max-width:85%}
.me{box-shadow:0 0 0 2px #FF6700 inset;justify-self:end}.in{display:flex;gap:.4rem;padding:.5rem;background:rgba(255,255,255,.06)}
.in input{flex:1;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.25);color:#fff;padding:.5rem .6rem}
.btn{border:0;border-radius:999px;padding:.5rem .8rem;font-weight:800;background:#FF6700;color:#fff;cursor:pointer}`;
const st=document.createElement("style"); st.textContent=css; document.head.appendChild(st);
const btn=document.createElement("button"); btn.className="cL"; btn.title="Clarion Call"; btn.textContent="ðŸ’¬";
const panel=document.createElement("div"); panel.className="cP";
panel.innerHTML=`<div class="cH"><strong>Clarion Call</strong><div><small id="ccu" style="opacity:.8"></small> <button id="ccl" class="btn" style="background:transparent;box-shadow:0 0 0 2px #FF6700 inset">Close</button></div></div><div id="cclog" class="cB"><div style="padding:.8rem;text-align:center;opacity:.85">Loadingâ€¦</div></div><div class="in"><input id="ccin" placeholder="Message officeâ€¦"/><button id="ccsend" class="btn">Send</button></div>`;
document.body.append(btn,panel);
let em=null;
async function user(){ const { data:{ user } }=await supabase.auth.getUser(); em=user?.email||null; const u=document.getElementById("ccu"); if(u) u.textContent=em||"Guest"; return user; }
async function log(){ const L=document.getElementById("cclog"); if(!em){ L.innerHTML='<div style="padding:.8rem;text-align:center;opacity:.85">Please <a style="color:#fff;text-decoration:underline" href="/login_basic.html?next=/post-auth.html">sign in</a>.</div>'; return; } const { data, error }=await supabase.from("messages").select("*").order("created_at",{ascending:false}).limit(100); if(error){ L.innerHTML=`<div style="padding:.8rem;text-align:center;opacity:.85">${error.message}</div>`; return; } L.innerHTML=""; (data||[]).reverse().forEach(m=>{ const d=document.createElement("div"); d.className="b "+(m.sender_email===em?"me":""); d.innerHTML=`<strong>${m.sender_email||""}</strong> <small style="opacity:.7">${new Date(m.created_at||Date.now()).toLocaleString()}</small><br>${(m.message||"").replace(/[<>&]/g,s=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[s]))}`; L.appendChild(d); }); L.scrollTop=L.scrollHeight; }
async function send(){ const i=document.getElementById("ccin"); const msg=(i.value||"").trim(); if(!msg) return; const { data:{ user } }=await supabase.auth.getUser(); await supabase.from("messages").insert({ message:msg, sender_id:user?.id, sender_email:user?.email, role:(user?.user_metadata?.role||"") }); i.value=""; }
function open(){ panel.style.display="grid"; log(); } function close(){ panel.style.display="none"; }
btn.onclick=open; document.getElementById("ccl").onclick=close; document.getElementById("ccsend").onclick=send;
document.getElementById("ccin").addEventListener("keydown",(e)=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }});
(async()=>{ await user(); setInterval(log,7000); log(); })();
window.ClarionChat={ open, close, toggle:()=>panel.style.display==="none"?open():close() };
