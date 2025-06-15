#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function validateExtension() {
  console.log('🔍 Validating SmartMark extension...');
  
  let isValid = true;
  const issues = [];

  // Check required files
  const requiredFiles = [
    'manifest.json',
    'background.js',
    'content.js',
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
  const requiredDirs = ['icons', 'utils'];
  
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

  // Check utility files
  console.log('🔧 Checking utility files...');
  const utilFiles = ['api.js', 'bookmark.js', 'storage.js', 'validation.js', 'error.js', 'ui.js'];
  utilFiles.forEach(file => {
    const filePath = path.join('utils', file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✓ utils/${file}`);
    } else {
      console.log(`  ❌ utils/${file} - MISSING`);
      issues.push(`Missing utility file: utils/${file}`);
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

if (require.main === module) {
  validateExtension();
}

module.exports = { validateExtension };
