const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs-extra');
const path = require('path');

// Files to obfuscate (in place - will overwrite originals!)
const filesToObfuscate = [
  'server.js',
  'commands/**/*.js',
  'lib/**/*.js',
  'utils/**/*.js',
  'admin.js',
  'commands.js',
  'category-commands.js',
  'supabase-session.js',
  'youtube.js'
];

async function obfuscateFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const result = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      deadCodeInjection: true,
      debugProtection: true,
      disableConsoleOutput: false,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      rotateStringArray: true,
      selfDefending: true,
      renameGlobals: false
    });
    
    // Write back to SAME file (overwrite)
    fs.writeFileSync(filePath, result.getObfuscatedCode());
    console.log(`✅ Obfuscated: ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed: ${filePath}`, error.message);
  }
}

async function main() {
  console.log('🔒 Obfuscating files in place...');
  console.log('⚠️  WARNING: Original files will be OVERWRITTEN!');
  console.log('⚠️  Make sure you have a BACKUP!\n');
  
  for (const pattern of filesToObfuscate) {
    const files = await fs.glob(pattern);
    for (const file of files) {
      await obfuscateFile(file);
    }
  }
  console.log('\n✅ Done! All files obfuscated in place.');
}

// Ask for confirmation first
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('⚠️  This will OVERWRITE your original files! Continue? (yes/no): ', async (answer) => {
  if (answer.toLowerCase() === 'yes') {
    await main();
  } else {
    console.log('❌ Cancelled. No files were changed.');
  }
  rl.close();
});