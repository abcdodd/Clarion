/**
 * identity_v60.js (v61.5)
 * - Paints email immediately from getSession()
 * - Resolves display name (profile_details → user_metadata → profiles → email local-part)
 * - Overrides specific emails to requested display names
 * - Listens to auth state changes; caches in sessionStorage
 */
import supabase from "./supabase_client_v58.js";
const CACHE_KEY = "clarion_identity_v60";
const OVERRIDES = {
  "abcdodd@gmail.com": "Agent Dodd",
  "mutantdan28@gmail.com": "Lord Dan"
};

function qs(sel){ return document.querySelector(sel); }
function setHeader(name, email){
  try {
    const nameEl = qs("#clrUserName");
    const emailEl = qs("#clrUserEmail");
    if (nameEl && typeof name === "string") nameEl.textContent = name;
    if (emailEl && typeof email === "string") emailEl.textContent = email;
  } catch {}
}
function localPart(email=""){ const i = String(email).indexOf("@"); return i>0 ? email.slice(0,i) : (email||""); }

async function resolveDisplayName(user){
  const email = (user?.email || "").toLowerCase();
  // 0) explicit overrides
  if (OVERRIDES[email]) return OVERRIDES[email];
  // 1) profile_details.display_name
  try{
    const { data } = await supabase.from("profile_details").select("display_name").eq("user_id", user.id).maybeSingle();
    if (data?.display_name) return data.display_name;
  }catch{}
  // 2) user_metadata
  const um = user?.user_metadata || {};
  if (um.full_name) return um.full_name;
  if (um.name) return um.name;
  // 3) profiles.display_name
  try{
    const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    if (data?.display_name) return data.display_name;
  }catch{}
  // 4) fallback
  return localPart(user.email);
}

function paintFromCache(){
  try{
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached){
      const { displayName, email } = JSON.parse(cached);
      if (displayName || email) setHeader(displayName||"", email||"");
    }
  }catch{}
}

async function paintFromSession(){
  const { data:{ session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user){ return false; }
  // Paint email immediately
  const email = user.email || "";
  if (email) setHeader(qs("#clrUserName")?.textContent || "", email);
  // Then resolve display name (with overrides)
  const displayName = await resolveDisplayName(user);
  setHeader(displayName, email);
  try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify({ id:user.id, email, displayName })); }catch{}
  try{ window.dispatchEvent(new CustomEvent("clarion:user", { detail: { id:user.id, email, displayName } })); }catch{}
  return true;
}

async function init(){
  paintFromCache();
  await paintFromSession();
  try{
    supabase.auth.onAuthStateChange((_evt, session)=>{
      const user = session?.user;
      if (user){
        (async ()=>{
          const email = user.email || "";
          const displayName = await resolveDisplayName(user);
          setHeader(displayName, email);
          try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify({ id:user.id, email, displayName })); }catch{}
          try{ window.dispatchEvent(new CustomEvent("clarion:user", { detail: { id:user.id, email, displayName } })); }catch{}
        })();
      }
    });
  }catch{}
}

document.addEventListener("DOMContentLoaded", init);