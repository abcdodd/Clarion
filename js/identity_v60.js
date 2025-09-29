/**
 * identity_v60.js (v61.6 final)
 * - Loads env first, then supabase (dynamic)
 * - Paints email immediately; resolves display name; overrides for Dodd/Dan
 */
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
function paintFromCache(){
  try{ const cached = sessionStorage.getItem(CACHE_KEY);
       if (cached){ const { displayName, email } = JSON.parse(cached||"{}"); setHeader(displayName||"", email||""); } }catch{}
}
async function resolveDisplayName(supabase, user){
  const email = (user?.email || "").toLowerCase();
  if (OVERRIDES[email]) return OVERRIDES[email];
  try{ const { data } = await supabase.from("profile_details").select("display_name").eq("user_id", user.id).maybeSingle();
       if (data?.display_name) return data.display_name; }catch{}
  const um = user?.user_metadata || {};
  if (um.full_name) return um.full_name;
  if (um.name) return um.name;
  try{ const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
       if (data?.display_name) return data.display_name; }catch{}
  return localPart(user.email);
}
async function init(){
  paintFromCache();
  await import("/js/env.js");
  const { default: supabase } = await import("./supabase_client_v58.js");

  const { data:{ session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;
  const email = user.email || "";
  if (email) setHeader(qs("#clrUserName")?.textContent || "", email);
  const displayName = await resolveDisplayName(supabase, user);
  setHeader(displayName, email);
  try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify({ id:user.id, email, displayName })); }catch{}

  try{ supabase.auth.onAuthStateChange((_evt, session)=>{
    const u = session?.user; if (!u) return;
    (async ()=>{
      const em = u.email || "";
      const dn = await resolveDisplayName(supabase, u);
      setHeader(dn, em);
      try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify({ id:u.id, email:em, displayName:dn })); }catch{}
    })();
  }); }catch{}
}
document.addEventListener("DOMContentLoaded", init);