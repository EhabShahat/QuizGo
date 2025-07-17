const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function initializeSupabase() {
  if (supabase) {
    return supabase;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabase;
}

function getSupabase() {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }
  return supabase;
}

module.exports = {
  initializeSupabase,
  getSupabase
};