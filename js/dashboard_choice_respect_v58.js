/**
 * dashboard_choice_respect_v58.js (v61.3)
 * - Composite role resolution: RPC → profiles → allowlist → lsp
 * - Respects sessionStorage.force_dashboard
 * - Supports ?pick=1 to stay
 * - Exposes window.__clarionRoleTrace for debugging
 */
import supabase from "./supabase_client_v58.js";

// Shared role constants
const ROLE_TO_PATH = {
  admin: "/dashboard_admin.html",
  manager: "/dashboard_manager.html",
  production: "/dashboard_production.html",
  lsp: "/dashboard_lsp.html"
};
const STRONG_ROLES = new Set(["admin","manager","production","lsp"]);
const ALLOWLIST = new Set(["abcdodd@gmail.com","mutantdan28@gmail.com"]); // temporary safety net

function normalizePath(p){ try{ return new URL(p, location.origin).pathname; }catch{ return p; } }
function go(p){
  const target = normalizePath(p);
  const here = normalizePath(location.pathname);
  if (target !== here) location.replace(target);
}

async function getRoleComposite(supabase){
  const trace = { via:"", rpc:null, profiles:null, allow:null };
  try{
    // 1) RPC
    try{
      const { data } = await supabase.rpc("clarion_self_role");
      if (data){ trace.rpc = String(data).toLowerCase(); }
    }catch(e){ trace.rpc = "rpc_error"; }

    // 2) If RPC returns a non-lsp strong role, trust it
    if (trace.rpc && trace.rpc !== "lsp" && STRONG_ROLES.has(trace.rpc)){ trace.via="rpc"; return { role: trace.rpc, trace }; }

    // 3) Try profiles
    let userId=null, email=null;
    try{ const { data:{ user } } = await supabase.auth.getUser(); userId = user?.id || null; email = (user?.email||"").toLowerCase(); }catch{}
    if (userId){
      try{
        const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
        const pr = String(data?.role || "").toLowerCase();
        if (STRONG_ROLES.has(pr) && pr !== "lsp"){ trace.via="profiles"; trace.profiles = pr; return { role: pr, trace }; }
        trace.profiles = pr || "(none)";
      }catch(e){ trace.profiles = "profiles_error"; }
    }

    // 4) Allowlist as final safety net during transition
    if (email && ALLOWLIST.has(email)){ trace.via="allowlist"; trace.allow = email; return { role: "manager", trace }; }

    // 5) Fallback
    trace.via = trace.via || "fallback";
    return { role: "lsp", trace };
  }catch{
    return { role: "lsp", trace: { via:"exception" } };
  }
}

async function init(){
  const url = new URL(location.href);
  if (url.searchParams.has("pick")) return; // stay on page if picker forced

  // honor session override
  try{ const forced = sessionStorage.getItem("force_dashboard"); if (forced && ROLE_TO_PATH[forced]) { go(ROLE_TO_PATH[forced]); return; } }catch{}

  // ensure signed in
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session?.user) return; // auth_guard handles redirects per page

  const { role, trace } = await getRoleComposite(supabase);
  // expose for diagnostics
  window.__clarionRoleTrace = trace;
  const path = ROLE_TO_PATH[role] || ROLE_TO_PATH.lsp;
  go(path);
}

document.addEventListener("DOMContentLoaded", init);