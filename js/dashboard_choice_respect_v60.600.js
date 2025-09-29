// Clarion v60 router — RPC-only, client-unifier, manager-aware
const PICKER_PATH = "/post-auth.html";
const LOGIN_BASIC = "/login_basic.html?next=/post-auth.html";
const DASHBOARD_PATHS = {
  admin:"/dashboard_admin.html",
  manager:"/dashboard_manager.html",
  production:"/dashboard_production.html",
  lsp:"/dashboard_lsp.html"
};

if (window.__clarion_nav_lock) {} else { window.__clarion_nav_lock = true; }
const url = new URL(location.href); const debug = url.searchParams.has("debug");
function isDash(p){ return /^\/dashboard_(admin|manager|production|lsp)\.html$/.test(p); }
function pathFor(r){ return DASHBOARD_PATHS[r] || DASHBOARD_PATHS.lsp; }
function navOnce(to){
  try{ const now=Date.now(), last=parseInt(sessionStorage.getItem("navstamp")||"0",10);
       if (now-last<900) return; sessionStorage.setItem("navstamp", String(now)); }catch{}
  if ((location.pathname+location.search)===to) return; location.replace(to);
}

async function ensureSupabase(){
  if (window.supabase?.auth) return true;
  try{
    const mod = await import("/js/supabase_client_v58.js");
    const c = mod?.supabase||mod?.default;
    if (c?.auth){ window.supabase=c; return true; }
  }catch{}
  let URL_=window.SUPABASE_URL, KEY_=window.SUPABASE_ANON_KEY;
  try{
    const env = await import("/js/env.js");
    URL_=URL_||env?.SUPABASE_URL||env?.default?.SUPABASE_URL;
    KEY_=KEY_||env?.SUPABASE_ANON_KEY||env?.default?.SUPABASE_ANON_KEY;
  }catch{}
  if (URL_ && KEY_){
    try{
      const sj = await import("https://esm.sh/@supabase/supabase-js@2.45.4");
      if (sj?.createClient){ window.supabase=sj.createClient(URL_, KEY_); return true; }
    }catch{}
  }
  console.error("[v60] No Supabase client available."); return false;
}
async function getRoleRpc(){ try{ const { data } = await supabase.rpc("clarion_self_role"); if (data) return String(data).toLowerCase(); }catch{} return "lsp"; }

(async function(){
  const ok = await ensureSupabase(); if (!ok) return;
  if (url.searchParams.has("reset")){
    try{ sessionStorage.clear(); localStorage.removeItem("debug_auth"); }catch{}
    navOnce(`${PICKER_PATH}?pick=1${debug?"&debug=1":""}`); return;
  }
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session?.user){ navOnce(LOGIN_BASIC + (debug?"&debug=1":"")); return; }

  const role = await getRoleRpc();
  const target = pathFor(role);

  if (debug){
    const bar=document.createElement("div");
    bar.style.cssText="position:fixed;z-index:2147483647;left:0;right:0;top:0;padding:4px 8px;font:12px/1.2 monospace;background:#111;color:#fff;opacity:.95";
    bar.textContent=`[clarion v60] email:${session.user.email} role:${role} path:${location.pathname}`;
    document.body.appendChild(bar);
    document.body.style.paddingTop="22px";
  }

  if (isDash(location.pathname)){
    if (location.pathname !== target){ navOnce(target); return; }
    return;
  }
  if (url.searchParams.has("pick") && location.pathname===PICKER_PATH){ return; }
  navOnce(target);
})();
