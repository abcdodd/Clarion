/**
 * logout_v61.js (v61.6 final)
 * - Loads env first, then supabase client
 * - Wires #clrSignOut
 */
function clearCaches(){
  try{ sessionStorage.removeItem("force_dashboard"); }catch{}
  try{ sessionStorage.removeItem("clarion_identity_v60"); }catch{}
}
async function doLogout(){
  await import("/js/env.js");
  const { default: supabase } = await import("./supabase_client_v58.js");
  try{ await supabase.auth.signOut(); }catch{}
  clearCaches();
  const login = new URL("/login_basic.html", location.origin);
  login.searchParams.set("next", "/post-auth.html");
  location.replace(login.pathname + "?" + login.searchParams.toString());
}
function attach(){
  const btn = document.getElementById("clrSignOut");
  if (btn && !btn.__wiredLogout){
    btn.__wiredLogout = true;
    btn.addEventListener("click", (e)=>{ e.preventDefault(); doLogout(); });
  }
}
document.addEventListener("DOMContentLoaded", attach);