function onReady(fn){ if (document.readyState==="loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }
function findButtons(){ return Array.from(document.querySelectorAll("#btnOpenChat")); }
function tryOpenChat(){
  if (window.ClarionChat && typeof window.ClarionChat.open==="function"){ window.ClarionChat.open(); return true; }
  if (typeof window.openClarionChat==="function"){ window.openClarionChat(); return true; }
  window.dispatchEvent(new CustomEvent("clarion:chat-open-request"));
  return false;
}
function wire(){
  findButtons().forEach(btn=>{
    if (btn.__wiredChat) return;
    btn.__wiredChat = true;
    btn.addEventListener("click",(e)=>{
      e.preventDefault();
      const ok = tryOpenChat();
      if (!ok){
        let tries=0;
        const t=setInterval(()=>{ tries++; if (tryOpenChat()||tries>20) clearInterval(t); },150);
      }
    });
  });
  try{ const url = new URL(location.href); if (url.searchParams.get("chat")==="1") setTimeout(()=>tryOpenChat(),200); }catch{}
}
window.addEventListener("clarion:chat-ready", wire);
onReady(wire);