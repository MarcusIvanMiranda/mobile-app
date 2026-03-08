// diagnostic.js - Save this file in your project root and run: node diagnostic.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Pet Landia App Diagnostics\n');

// Check 1: app.json
console.log('1️⃣ Checking app.json...');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  
  if (appJson.expo.plugins.some(p => p === 'expo-router' || (Array.isArray(p) && p[0] === 'expo-router'))) {
    console.log('   ❌ ERROR: expo-router plugin found in app.json');
    console.log('   Fix: Remove "expo-router" from plugins array');
  } else {
    console.log('   ✅ No expo-router plugin (Good!)');
  }
  
  if (appJson.expo.experiments?.typedRoutes) {
    console.log('   ❌ ERROR: typedRoutes experiment enabled');
    console.log('   Fix: Remove experiments section');
  } else {
    console.log('   ✅ No typedRoutes experiment (Good!)');
  }
} catch (e) {
  console.log('   ❌ Could not read app.json:', e.message);
}

// Check 2: app folder
console.log('\n2️⃣ Checking for app/ directory...');
if (fs.existsSync('app')) {
  console.log('   ❌ ERROR: app/ directory exists');
  console.log('   Fix: Delete or rename the app/ folder');
  console.log('   Command: rename app app_backup');
} else {
  console.log('   ✅ No app/ directory (Good!)');
}

// Check 3: package.json
console.log('\n3️⃣ Checking package.json dependencies...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  if (deps['expo-router']) {
    console.log('   ❌ ERROR: expo-router is installed');
    console.log('   Fix: npm uninstall expo-router');
  } else {
    console.log('   ✅ expo-router not installed (Good!)');
  }
  
  const required = [
    '@react-navigation/native',
    '@react-navigation/native-stack',
    '@react-navigation/bottom-tabs',
    'react-native-screens',
    'react-native-safe-area-context'
  ];
  
  console.log('\n   Required React Navigation packages:');
  required.forEach(pkg => {
    if (deps[pkg]) {
      console.log(`   ✅ ${pkg} installed`);
    } else {
      console.log(`   ❌ ${pkg} NOT installed`);
      console.log(`      Fix: npm install ${pkg}`);
    }
  });
} catch (e) {
  console.log('   ❌ Could not read package.json:', e.message);
}

// Check 4: Navigation files
console.log('\n4️⃣ Checking navigation files...');
const navFiles = [
  'navigation/RootNavigator.tsx',
  'navigation/MainTabNavigator.tsx'
];

navFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} NOT FOUND`);
  }
});

// Check 5: App.tsx
console.log('\n5️⃣ Checking App.tsx...');
try {
  const appContent = fs.readFileSync('App.tsx', 'utf8');
  
  if (appContent.includes('RootNavigator')) {
    console.log('   ✅ Uses RootNavigator (Good!)');
  } else {
    console.log('   ❌ Does not import RootNavigator');
  }
  
  if (appContent.includes('expo-router') || appContent.includes('Slot')) {
    console.log('   ❌ Contains expo-router imports');
  } else {
    console.log('   ✅ No expo-router imports (Good!)');
  }
} catch (e) {
  console.log('   ❌ Could not read App.tsx:', e.message);
}

console.log('\n' + '='.repeat(50));
console.log('📋 Summary:');
console.log('Run the fixes shown above, then:');
console.log('1. rmdir /s /q node_modules');
console.log('2. del package-lock.json');
console.log('3. npm install');
console.log('4. npx expo start -c');
console.log('='.repeat(50) + '\n');