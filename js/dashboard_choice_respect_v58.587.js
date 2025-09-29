
/**
 * Clarion v58.7 router — "client-unifier"
 * - First tries window.supabase
 * - Then imports your site's ESM client: /js/supabase_client_v58.js and uses its export
 * - Then tries env module exports OR window env + creates a client
 * - Uses ONLY RPC public.clarion_self_role() (no profiles select)
 * - No UI/CSS changes; optional debug banner with ?debug=1
 */
const PICKER_PATH = "/post-auth.html";
const LOGIN_BASIC = "/login_basic.html?next=/post-auth.html";
const DASHBOARD_PATHS = { admin:"/dashboard_admin.html", production:"/dashboard_production.html", lsp:"/dashboard_lsp.html" };

if (window.__clarion_nav_lock) { /* avoid double-run */ } else { window.__clarion_nav_lock = true; }

const url = new URL(location.href);
const debug = url.searchParams.has("debug");

function isDash(p){ return /^\/dashboard_(admin|production|lsp)\.html$/.test(p); }
function pathFor(r){ return DASHBOARD_PATHS[r] || DASHBOARD_PATHS.lsp; }
function navOnce(to){
  try{ const now=Date.now(), last=parseInt(sessionStorage.getItem("navstamp")||"0",10);
       if (now-last<900) return; sessionStorage.setItem("navstamp", String(now)); }catch{}
  if ((location.pathname+location.search)===to) return;
  location.replace(to);
}

async function ensureSupabase(){
  // 0) Global already present?
  if (window.supabase && window.supabase.auth) return true;

  // 1) Try to import the site's ESM client and reuse its export
  try{
    const mod = await import("/js/supabase_client_v58.js");
    const candidate = mod?.supabase || mod?.default || mod?.client || null;
    if (candidate && candidate.auth){
      window.supabase = candidate;
      return true;
    }
  }catch(e){ /* ignore; not fatal */ }

  // 2) Try env module (module exports OR window globals)
  let ENV_URL = window.SUPABASE_URL;
  let ENV_KEY = window.SUPABASE_ANON_KEY;
  try{
    const env = await import("/js/env.js");
    ENV_URL = ENV_URL || env?.SUPABASE_URL || env?.default?.SUPABASE_URL;
    ENV_KEY = ENV_KEY || env?.SUPABASE_ANON_KEY || env?.default?.SUPABASE_ANON_KEY;
  }catch(e){ /* env.js missing or not a module; ok */ }

  // 3) If we have credentials, create a fresh client via ESM supabase-js
  if (ENV_URL && ENV_KEY){
    try{
      const sj = await import("https://esm.sh/@supabase/supabase-js@2.45.4");
      if (sj?.createClient){
        window.supabase = sj.createClient(ENV_URL, ENV_KEY);
        return true;
      }
    }catch(e){ console.error("[clarion v587] Failed to load supabase-js:", e); }
  }

  console.error("[clarion v587] No Supabase client available (cannot import client or env).");
  return false;
}

async function getRoleRpc(){
  try{
    const { data, error } = await supabase.rpc("clarion_self_role");
    if (error) { console.error("[clarion v587] RPC error:", error.message); return "lsp"; }
    return (data && String(data)) || "lsp";
  }catch(e){
    console.error("[clarion v587] RPC ex:", e?.message||e);
    return "lsp";
  }
}

(async function(){
  const ok = await ensureSupabase();
  if (!ok){ return; }

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
    bar.textContent=`[clarion v587] email:${session.user.email} role:${role} path:${location.pathname}`;
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
