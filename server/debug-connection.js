require('dotenv').config();

console.log('Environment variables check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set (length: ' + process.env.SUPABASE_SERVICE_KEY.length + ')' : 'Not set');

if (process.env.SUPABASE_URL) {
  console.log('URL format check:', process.env.SUPABASE_URL.startsWith('https://') ? 'Valid' : 'Invalid');
}

const { createClient } = require('@supabase/supabase-js');

async function simpleTest() {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    console.log('\nTesting simple query...');
    const { data, error } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Query error (this is expected if tables don\'t exist):', error.message);
    } else {
      console.log('✅ Connection successful!');
    }
    
  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

simpleTest();