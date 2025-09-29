
/**
 * Clarion v58.3 stateless router (DB-authoritative; cache-busted v583)
 * - Ignores stale sessionStorage; routes by DB role each load
 * - RPC: public.clarion_self_role() -> role
 * - Fallback: SELECT role FROM public.profiles WHERE id = auth.uid()
 * - No UI/CSS changes; only navigation
 */
const PICKER_PATH = "/post-auth.html";
const LOGIN_BASIC = "/login_basic.html?next=/post-auth.html";
const DASHBOARD_PATHS = { admin:"/dashboard_admin.html", production:"/dashboard_production.html", lsp:"/dashboard_lsp.html" };

if (window.__clarion_nav_lock) { /* avoid double-run */ } else { window.__clarion_nav_lock = true; }

const url = new URL(location.href);

function isDash(p){ return /^\/dashboard_(admin|production|lsp)\.html$/.test(p); }
function pathFor(r){ return DASHBOARD_PATHS[r] || DASHBOARD_PATHS.lsp; }
function navOnce(to){
  try{ const now=Date.now(), last=parseInt(sessionStorage.getItem("navstamp")||"0",10);
       if (now-last<900) return; sessionStorage.setItem("navstamp", String(now)); }catch{}
  if ((location.pathname+location.search)===to) return;
  location.replace(to);
}

async function getDbRole(){
  // Prefer RPC
  try{
    const { data, error } = await supabase.rpc("clarion_self_role");
    if (!error && data) return String(data);
  }catch(e){}
  // Fallback: fetch self row explicitly
  try{
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess?.session?.user?.id;
    const { data, error } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
    if (!error && data && data.role) return String(data.role);
  }catch(e){}
  return "lsp";
}

(async function(){
  if (!window.supabase || !window.supabase.auth){ return; }

  // Reset pathway respected
  if (url.searchParams.has("reset")){
    try{ sessionStorage.clear(); localStorage.removeItem("debug_auth"); }catch{}
    navOnce(`${PICKER_PATH}?pick=1`); return;
  }

  const { data:{ session } } = await supabase.auth.getSession();
  if (!session?.user){ navOnce(LOGIN_BASIC); return; }

  const role = await getDbRole();
  const target = pathFor(role);

  if (isDash(location.pathname)){
    if (location.pathname !== target){ navOnce(target); return; }
    return;
  }

  if (url.searchParams.has("pick") && location.pathname===PICKER_PATH){ return; }

  navOnce(target);
})();
