const { supabaseService } = require('./src/services/supabaseService');

async function testConnection() {
  console.log('Testing Supabase connection...\n');
  
  try {
    // Test basic connection
    const health = await supabaseService.healthCheck();
    console.log('Health check:', health);
    
    if (health.status === 'healthy') {
      console.log('✅ Supabase connection successful!');
      
      // Test a simple query
      const { data, error } = await supabaseService.client
        .from('quizzes')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('⚠️  Tables may not exist yet. Run migrations first.');
        console.log('Error:', error.message);
      } else {
        console.log('✅ Database tables accessible!');
      }
    } else {
      console.log('❌ Connection failed:', health.error);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\nMake sure you have:');
    console.log('1. Created a .env file with your Supabase credentials');
    console.log('2. Set SUPABASE_URL and SUPABASE_SERVICE_KEY');
    console.log('3. Run the database migrations');
  }
}

testConnection();