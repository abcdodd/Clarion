
/**
 * Clarion v58.2 "stateless" router (DB-authoritative, cache-busted v582)
 */
const PICKER_PATH = "/post-auth.html";
const LOGIN_BASIC = "/login_basic.html?next=/post-auth.html";
const DASHBOARD_PATHS = { admin:"/dashboard_admin.html", production:"/dashboard_production.html", lsp:"/dashboard_lsp.html" };

if (window.__clarion_nav_lock) { /* avoid double-run */ } else { window.__clarion_nav_lock = true; }

const url = new URL(location.href);
const debug = url.searchParams.has("debug") || localStorage.getItem("debug_auth")==="1";
function log(...a){ if (debug) console.log("[clarion v582]", ...a); }

function isDash(p){ return /^\/dashboard_(admin|production|lsp)\.html$/.test(p); }
function pathFor(r){ return DASHBOARD_PATHS[r] || DASHBOARD_PATHS.lsp; }
function navOnce(to){
  try{ const now=Date.now(), last=parseInt(sessionStorage.getItem("navstamp")||"0",10);
       if (now-last<900) return; sessionStorage.setItem("navstamp", String(now)); }catch{}
  if ((location.pathname+location.search)===to) return;
  location.replace(to);
}

async function getDbRole(){
  try{
    const { data, error } = await supabase.rpc("clarion_self_role");
    if (!error && data) return String(data);
    if (error) log("rpc error:", error.message);
  }catch(e){ log("rpc ex:", e?.message||e); }
  try{
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess?.session?.user?.id;
    const { data, error } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
    if (!error && data && data.role) return String(data.role);
    if (error) log("profiles error:", error.message);
  }catch(e){ log("profiles ex:", e?.message||e); }
  return "lsp";
}

(async function(){
  if (!window.supabase || !window.supabase.auth){ console.error("[clarion v582] supabase missing"); return; }

  if (url.searchParams.has("reset")){
    try{ sessionStorage.clear(); localStorage.removeItem("debug_auth"); }catch{}
    navOnce(`${PICKER_PATH}?pick=1${debug?"&debug=1":""}`); return;
  }

  const { data:{ session } } = await supabase.auth.getSession();
  if (!session?.user){ navOnce(LOGIN_BASIC + (debug?"&debug=1":"")); return; }

  const role = await getDbRole();
  const target = pathFor(role);

  if (debug){
    const bar=document.createElement("div");
    bar.style.cssText="position:fixed;z-index:2147483647;left:0;right:0;top:0;padding:4px 8px;font:12px/1.2 monospace;background:#111;color:#fff;opacity:.95";
    bar.textContent=`[clarion v582] email:${session.user.email} role:${role} path:${location.pathname}`;
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
