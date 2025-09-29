// Expects window.SUPABASE_URL and window.SUPABASE_ANON_KEY injected globally (e.g., in your site template)
if (!window.supabase) {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.warn("[clarion] Missing SUPABASE_URL / SUPABASE_ANON_KEY. Set them on window before this script.");
  } else {
    window.supabase = window.supabase || window.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
}