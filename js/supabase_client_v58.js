import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
export const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
export default supabase;
