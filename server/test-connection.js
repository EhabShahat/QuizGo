// Test Redis connection on Railway
const redis = require('redis');

async function testRedisConnection() {
  console.log('🧪 Testing Redis connection on Railway...\n');

  console.log('Environment Variables:');
  console.log('REDIS_URL:', process.env.REDIS_URL ? 'Set ✅' : 'Missing ❌');
  console.log('NODE_ENV:', process.env.NODE_ENV);

  if (!process.env.REDIS_URL) {
    console.log('\n❌ REDIS_URL environment variable is not set');
    console.log('Please add REDIS_URL in Railway Variables tab');
    return;
  }

  try {
    console.log('\n🔗 Connecting to Redis...');
    const client = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 10000,
        lazyConnect: true,
      }
    });

    client.on('error', (err) => {
      console.log('❌ Redis Error:', err.message);
    });

    client.on('connect', () => {
      console.log('🔌 Redis Connected');
    });

    client.on('ready', () => {
      console.log('✅ Redis Ready');
    });

    await client.connect();
    
    // Test basic operations
    console.log('\n🧪 Testing Redis operations...');
    
    await client.set('test:key', 'Hello Railway!');
    const value = await client.get('test:key');
    console.log('Set/Get test:', value === 'Hello Railway!' ? '✅' : '❌');
    
    await client.del('test:key');
    console.log('Delete test: ✅');
    
    await client.disconnect();
    console.log('\n🎉 Redis connection test successful!');
    
  } catch (error) {
    console.log('\n❌ Redis connection failed:', error.message);
    console.log('\nDebugging info:');
    console.log('- Check if Redis service is running in Railway');
    console.log('- Verify REDIS_URL format: redis://default:password@host:port');
    console.log('- Make sure both services are in the same Railway project');
  }
}

testRedisConnection();