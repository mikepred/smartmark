#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function validateExtension() {
  console.log('🔍 Validating SmartMark extension...');
  
  let isValid = true;
  const issues = [];

  // Check required files
  const requiredFiles = [
    'manifest.json',
    'background.js',
    'popup.html',
    'popup.js',
    'settings.html',
    'settings.js',
    'LICENSE'
  ];

  console.log('📄 Checking required files...');
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✓ ${file}`);
    } else {
      console.log(`  ❌ ${file} - MISSING`);
      issues.push(`Missing required file: ${file}`);
      isValid = false;
    }
  });

  // Check required directories
  const requiredDirs = ['icons', 'lib'];
  
  console.log('📁 Checking required directories...');
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      console.log(`  ✓ ${dir}/`);
    } else {
      console.log(`  ❌ ${dir}/ - MISSING`);
      issues.push(`Missing required directory: ${dir}/`);
      isValid = false;
    }
  });

  // Validate manifest.json
  console.log('📋 Validating manifest.json...');
  try {
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    
    // Check manifest version
    if (manifest.manifest_version === 3) {
      console.log('  ✓ Manifest V3');
    } else {
      console.log(`  ❌ Manifest version is ${manifest.manifest_version}, should be 3`);
      issues.push('Manifest version must be 3');
      isValid = false;
    }

    // Check required manifest fields
    const requiredFields = ['name', 'version', 'description', 'permissions', 'background', 'action'];
    requiredFields.forEach(field => {
      if (manifest[field]) {
        console.log(`  ✓ ${field}`);
      } else {
        console.log(`  ❌ ${field} - MISSING`);
        issues.push(`Missing manifest field: ${field}`);
        isValid = false;
      }
    });

    // Check permissions
    const requiredPermissions = ['activeTab', 'bookmarks', 'storage', 'scripting'];
    if (manifest.permissions) {
      requiredPermissions.forEach(permission => {
        if (manifest.permissions.includes(permission)) {
          console.log(`  ✓ Permission: ${permission}`);
        } else {
          console.log(`  ❌ Permission: ${permission} - MISSING`);
          issues.push(`Missing permission: ${permission}`);
          isValid = false;
        }
      });
    }

  } catch (error) {
    console.log('  ❌ Invalid JSON format');
    issues.push('manifest.json is not valid JSON');
    isValid = false;
  }

  // Check icons
  console.log('🎨 Checking icons...');
  const iconSizes = ['16', '19', '32', '38', '48', '128'];
  iconSizes.forEach(size => {
    const iconPath = path.join('icons', `icon${size}.png`);
    if (fs.existsSync(iconPath)) {
      console.log(`  ✓ icon${size}.png`);
    } else {
      console.log(`  ⚠️  icon${size}.png - MISSING (recommended)`);
    }
  });

  // Check library files
  console.log('🔧 Checking library files...');
  const libFiles = ['ai.js', 'bookmarks.js', 'storage.js'];
  libFiles.forEach(file => {
    const filePath = path.join('lib', file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✓ lib/${file}`);
    } else {
      console.log(`  ❌ lib/${file} - MISSING`);
      issues.push(`Missing library file: lib/${file}`);
      isValid = false;
    }
  });

  // Summary
  console.log('\n📊 Validation Summary:');
  if (isValid) {
    console.log('✅ Extension validation passed!');
    console.log('🚀 Ready for packaging and distribution');
  } else {
    console.log('❌ Extension validation failed!');
    console.log('\n🔧 Issues found:');
    issues.forEach(issue => console.log(`  • ${issue}`));
    process.exit(1);
  }
}

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateExtension();
}

export { validateExtension };
