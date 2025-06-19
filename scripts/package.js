#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const packageName = 'smartmark-extension';
const distDir = 'dist';

// Essential files to include in the extension package
const essentialFiles = [
  'manifest.json',
  'background.js',
  'popup.html',
  'popup.js',
  'settings.html',
  'settings.js',
  'LICENSE',
  'README.md'
];

const essentialDirectories = [
  'icons',
  'lib'
];

function createPackage() {
  console.log('📦 Creating SmartMark extension package...');

  // Clean and create dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.mkdirSync(distDir);

  const packageDir = path.join(distDir, packageName);
  fs.mkdirSync(packageDir);

  // Copy essential files
  console.log('📄 Copying files...');
  essentialFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(packageDir, file));
      console.log(`  ✓ ${file}`);
    } else {
      console.warn(`  ⚠️  ${file} not found`);
    }
  });

  // Copy essential directories
  console.log('📁 Copying directories...');
  essentialDirectories.forEach(dir => {
    if (fs.existsSync(dir)) {
      copyDirectory(dir, path.join(packageDir, dir));
      console.log(`  ✓ ${dir}/`);
    } else {
      console.warn(`  ⚠️  ${dir}/ not found`);
    }
  });

  // Read version from manifest
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  const version = manifest.version;

  // Create zip file
  console.log('🗜️  Creating zip file...');
  const zipName = `${packageName}-v${version}.zip`;
  
  try {
    process.chdir(distDir);
    execSync(`zip -r ${zipName} ${packageName}`, { stdio: 'inherit' });
    process.chdir('..');
    
    console.log(`✅ Package created successfully: ${distDir}/${zipName}`);
    console.log(`📊 Package size: ${(fs.statSync(path.join(distDir, zipName)).size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Failed to create zip file:', error.message);
    process.exit(1);
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createPackage();
}

export { createPackage };
