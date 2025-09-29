/**
 * dashboard_choice_respect_v58.js (v61.6 final)
 * - Loads env first, then supabase client (dynamic import)
 * - Composite role: RPC → profiles → allowlist
 * - Honors session override; supports ?pick=1
 */
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
      if (data) trace.rpc = String(data).toLowerCase();
    }catch(e){ trace.rpc = "rpc_error"; }

    if (trace.rpc && trace.rpc !== "lsp" && STRONG_ROLES.has(trace.rpc)){
      trace.via = "rpc";
      return { role: trace.rpc, trace };
    }

    // 2) profiles fallback
    let userId=null, email=null;
    try{
      const { data:{ user } } = await supabase.auth.getUser();
      userId = user?.id || null;
      email = (user?.email||"").toLowerCase();
    }catch{}
    if (userId){
      try{
        const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
        const pr = String(data?.role || "").toLowerCase();
        if (STRONG_ROLES.has(pr) && pr !== "lsp"){
          trace.via="profiles"; trace.profiles=pr;
          return { role: pr, trace };
        }
        trace.profiles = pr || "(none)";
      }catch(e){ trace.profiles = "profiles_error"; }
    }

    // 3) allowlist safety net
    if (email && ALLOWLIST.has(email)){
      trace.via="allowlist"; trace.allow=email;
      return { role:"manager", trace };
    }

    trace.via = trace.via || "fallback";
    return { role:"lsp", trace };
  }catch{
    return { role:"lsp", trace:{ via:"exception" } };
  }
}

async function init(){
  const url = new URL(location.href);
  if (url.searchParams.has("pick")) return; // stay for explicit chooser

  // Load env then client
  await import("/js/env.js");
  const { default: supabase } = await import("./supabase_client_v58.js");

  // Honor session override if set
  try{
    const forced = sessionStorage.getItem("force_dashboard");
    if (forced && ROLE_TO_PATH[forced]) { go(ROLE_TO_PATH[forced]); return; }
  }catch{}

  const { data:{ session } } = await supabase.auth.getSession();
  if (!session?.user) return; // page guard/HTML will handle login redirect

  const { role, trace } = await getRoleComposite(supabase);
  window.__clarionRoleTrace = trace;
  go(ROLE_TO_PATH[role] || ROLE_TO_PATH.lsp);
}

document.addEventListener("DOMContentLoaded", init);