/**
 * auth_guard_v58.js (v61.6 final)
 * - Loads env first, then supabase client dynamically
 * - Enforces per-page role access, recognizes 'manager'
 */
const PATH = location.pathname.replace(/\+/g,"/").toLowerCase();

const PAGE_ROLES = {
  "/dashboard_manager.html":      ["manager"],
  "/dashboard_admin.html":        ["admin","manager"],
  "/dashboard_production.html":   ["production","manager"],
  "/dashboard_lsp.html":          ["lsp","manager"],
};
const ROLE_TO_PATH = {
  admin: "/dashboard_admin.html",
  manager: "/dashboard_manager.html",
  production: "/dashboard_production.html",
  lsp: "/dashboard_lsp.html"
};
const STRONG_ROLES = new Set(["admin","manager","production","lsp"]);
const ALLOWLIST = new Set(["abcdodd@gmail.com","mutantdan28@gmail.com"]);

function needRolesFor(path){ return PAGE_ROLES[path] || null; }
function goRole(role){ const target = ROLE_TO_PATH[role] || ROLE_TO_PATH.lsp; if (location.pathname !== target) location.replace(target); }
function redirectToLogin(){
  const login = new URL("/login_basic.html", location.origin);
  login.searchParams.set("next", location.pathname + location.search);
  location.replace(login.pathname + "?" + login.searchParams.toString());
}

async function getRoleComposite(supabase){
  try{
    // Prefer RPC
    let role = "lsp";
    try{ const { data } = await supabase.rpc("clarion_self_role"); if (data) role = String(data).toLowerCase(); }catch{}

    if (role === "lsp"){
      // profiles fallback
      let email=null, userId=null;
      try{ const { data:{ user } } = await supabase.auth.getUser(); userId=user?.id||null; email=(user?.email||"").toLowerCase(); }catch{}
      if (userId){
        try{ const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
             const pr = String(data?.role || "").toLowerCase(); if (STRONG_ROLES.has(pr) && pr !== "lsp") role = pr; }catch{}
      }
      if (role==="lsp" && email && ALLOWLIST.has(email)) role = "manager";
    }
    return role;
  }catch{ return "lsp"; }
}

(async ()=>{
  await import("/js/env.js");
  const { default: supabase } = await import("./supabase_client_v58.js");

  const { data:{ session } } = await supabase.auth.getSession();
  if (!session?.user){ redirectToLogin(); return; }
  if (PATH === "/post-auth.html") return;

  try{
    const forced = sessionStorage.getItem("force_dashboard");
    if (forced && ROLE_TO_PATH[forced]) { goRole(forced); return; }
  }catch{}

  const role = await getRoleComposite(supabase);
  const needed = needRolesFor(PATH);
  if (needed && !needed.includes(role)){ goRole(role); return; }
  // allowed
})();