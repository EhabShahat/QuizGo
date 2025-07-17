// Auto-deploy script - watches for file changes and auto-pushes to GitHub
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

console.log('🤖 Auto-deploy watcher started...');
console.log('📁 Watching for file changes in:', __dirname);
console.log('⚠️  Press Ctrl+C to stop\n');

let deployTimeout;
const DEPLOY_DELAY = 5000; // 5 seconds delay after last change

// Watch for file changes
fs.watch(__dirname, { recursive: true }, (eventType, filename) => {
  // Ignore node_modules, .git, and other system files
  if (filename && !filename.includes('node_modules') && 
      !filename.includes('.git') && 
      !filename.includes('.env') &&
      !filename.startsWith('.')) {
    
    console.log(`📝 File changed: ${filename}`);
    
    // Clear previous timeout
    if (deployTimeout) {
      clearTimeout(deployTimeout);
    }
    
    // Set new timeout for deployment
    deployTimeout = setTimeout(() => {
      console.log('\n🚀 Auto-deploying changes...');
      
      exec('git add . && git commit -m "Auto-deploy: file changes detected" && git push origin main', 
        (error, stdout, stderr) => {
          if (error) {
            console.log('❌ Deploy failed:', error.message);
            return;
          }
          
          if (stderr && !stderr.includes('warning')) {
            console.log('⚠️  Deploy warning:', stderr);
          }
          
          console.log('✅ Auto-deploy successful!');
          console.log('🚀 Railway will redeploy automatically\n');
        });
    }, DEPLOY_DELAY);
  }
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Auto-deploy watcher stopped');
  process.exit(0);
});