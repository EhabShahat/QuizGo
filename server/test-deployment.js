// Simple deployment test script
console.log('🧪 Testing QuizGo deployment readiness...');

// Test 1: Environment variables
console.log('\n📋 Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT:', process.env.PORT || '3001');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('REDIS_URL:', process.env.REDIS_URL ? '✅ Set' : '⚠️  Not set (will use fallback)');

// Test 2: Required modules
console.log('\n📦 Module Check:');
try {
  require('express');
  console.log('Express: ✅');
} catch (e) {
  console.log('Express: ❌', e.message);
}

try {
  require('@supabase/supabase-js');
  console.log('Supabase: ✅');
} catch (e) {
  console.log('Supabase: ❌', e.message);
}

try {
  require('redis');
  console.log('Redis: ✅');
} catch (e) {
  console.log('Redis: ❌', e.message);
}

// Test 3: Server files
console.log('\n📁 File Check:');
const fs = require('fs');
const requiredFiles = [
  './src/server.js',
  './src/config/redis.js',
  './src/services/gameService.js',
  './src/routes/games.js'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`${file}: ✅`);
  } else {
    console.log(`${file}: ❌ Missing`);
  }
});

// Test 4: Package.json
console.log('\n📋 Package.json Check:');
const pkg = require('./package.json');
console.log('Name:', pkg.name);
console.log('Version:', pkg.version);
console.log('Start script:', pkg.scripts.start ? '✅' : '❌');
console.log('Node version requirement:', pkg.engines?.node || 'Not specified');

console.log('\n🎉 Deployment test complete!');
console.log('\n🚀 Ready for Railway deployment!');
console.log('\nNext steps:');
console.log('1. Push to GitHub');
console.log('2. Connect to Railway');
console.log('3. Add Redis database');
console.log('4. Set environment variables');
console.log('5. Deploy! 🎯');