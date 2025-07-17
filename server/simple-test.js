require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('Testing direct Supabase connection...\n');

// Check environment variables
console.log('Environment check:');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.log('\n❌ Missing environment variables. Please check your .env file.');
  process.exit(1);
}

// Test connection
async function testDirectConnection() {
  try {
    console.log('\nCreating Supabase client...');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    console.log('Testing with a simple table query...');
    
    // Try to query the quizzes table we just created
    const { data, error } = await supabase
      .from('quizzes')
      .select('count')
      .limit(1);

    if (error) {
      console.log('Query error:', error.message);
      console.log('Error details:', error);
    } else {
      console.log('✅ Connection successful!');
      console.log('✅ Tables are accessible!');
      console.log('Query result:', data);
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    // Provide troubleshooting tips
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if your SUPABASE_URL is correct (should start with https://)');
    console.log('2. Verify your SUPABASE_SERVICE_KEY is the service_role key, not anon key');
    console.log('3. Make sure your Supabase project is active and not paused');
    console.log('4. Check if there are any firewall/network restrictions');
  }
}

testDirectConnection();