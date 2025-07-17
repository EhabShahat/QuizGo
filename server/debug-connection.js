// Debug script to test Railway deployment
const { createClient } = require('@supabase/supabase-js');
const redis = require('redis');

async function testConnections() {
  console.log('🧪 Testing Railway deployment connections...\n');

  // Test 1: Environment Variables
  console.log('📋 Environment Variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
  console.log('REDIS_URL:', process.env.REDIS_URL ? '✅ Set' : '❌ Missing');
  console.log('CLIENT_URL:', process.env.CLIENT_URL);

  // Test 2: Supabase Connection
  console.log('\n🗄️  Testing Supabase Connection:');
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      const { data, error } = await supabase
        .from('quizzes')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('Supabase: ⚠️  Connected but query failed:', error.message);
      } else {
        console.log('Supabase: ✅ Connected and working');
      }
    } else {
      console.log('Supabase: ❌ Missing credentials');
    }
  } catch (error) {
    console.log('Supabase: ❌ Connection failed:', error.message);
  }

  // Test 3: Redis Connection
  console.log('\n🔴 Testing Redis Connection:');
  try {
    if (process.env.REDIS_URL) {
      const redisClient = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
        }
      });

      redisClient.on('error', (err) => {
        console.log('Redis: ❌ Connection error:', err.message);
      });

      await redisClient.connect();
      await redisClient.ping();
      console.log('Redis: ✅ Connected and working');
      await redisClient.disconnect();
    } else {
      console.log('Redis: ❌ REDIS_URL not set');
    }
  } catch (error) {
    console.log('Redis: ❌ Connection failed:', error.message);
  }

  console.log('\n🎯 Connection test complete!');
}

testConnections().catch(console.error);