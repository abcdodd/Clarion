/**
 * logout_v61.js
 * - Wires #clrSignOut to supabase.auth.signOut()
 * - Clears session overrides & cached identity
 * - Returns to login page with next=/post-auth.html
 */
import supabase from "./supabase_client_v58.js";

function clearCaches(){
  try{ sessionStorage.removeItem("force_dashboard"); }catch{}
  try{ sessionStorage.removeItem("clarion_identity_v60"); }catch{}
}

async function doLogout(){
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