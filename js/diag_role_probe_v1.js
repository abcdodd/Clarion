
/* Clarion Diagnostics v1 — role probe */
(async function(){
  // Ensure supabase client exists or create it from env.js
  async function ensureSupabase(){
    if (window.supabase && window.supabase.auth) return true;
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY){
      try { await import("/js/env.js"); } catch(e){}
    }
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY){
      append("ERROR", "Missing SUPABASE_URL / SUPABASE_ANON_KEY (env.js not loaded or empty).");
      return false;
    }
    try{
      const mod = await import("https://esm.sh/@supabase/supabase-js@2.45.4");
      window.supabase = mod.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      return true;
    }catch(e){
      append("ERROR", "Failed to load supabase-js: " + (e?.message||e));
      return false;
    }
  }

  function append(label, val){
    const pre = document.getElementById("out");
    pre.textContent += `${label}: ${typeof val==='string'?val:JSON.stringify(val,null,2)}\n`;
  }

  append("PAGE", location.pathname + location.search);
  append("ENV.URL", window.SUPABASE_URL || "(unset)");
  append("ENV.KEY", window.SUPABASE_ANON_KEY ? "(present)" : "(missing)");

  const ok = await ensureSupabase();
  if (!ok) return;

  try{
    const { data:{ session }, error } = await supabase.auth.getSession();
    if (error) append("auth.getSession error", error.message);
    append("SESSION?", !!session);
    if (!session){ append("NEXT", "Go to /login_basic.html?next=/diagnostics.html"); return; }

    const email = session.user?.email || "(none)";
    append("USER.EMAIL", email);
    append("USER.ID", session.user?.id || "(none)");
    append("USER.METADATA", session.user?.user_metadata || {});

    // RPC
    try{
      const { data, error } = await supabase.rpc("clarion_self_role");
      if (error) append("RPC clarion_self_role error", error.message);
      append("RPC ROLE", data || "(null)");
    }catch(e){ append("RPC clarion_self_role ex", e?.message||e); }

    // Profiles by self id
    try{
      const { data:prof, error } = await supabase
        .from("profiles")
        .select("id,email,role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (error) append("SELECT profiles error", error.message);
      append("PROFILES ROW", prof || "(null)");
    }catch(e){ append("SELECT profiles ex", e?.message||e); }

    append("NOTE", "If RPC ROLE='lsp' and PROFILES shows role='lsp', update that row to 'admin'.");
  }catch(e){
    append("FATAL", e?.message||e);
  }
})();
