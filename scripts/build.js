/**
 * @file build.js
 * @description Simple build script that copies the web application files
 * into the www/ directory for Capacitor packaging. No bundling needed
 * since this is a vanilla JS app with static files.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..');
const DEST = path.resolve(__dirname, '..', 'www');

/** Directories to copy (relative to project root) */
const COPY_DIRS = ['css', 'js'];

/** Files to copy (relative to project root) */
const COPY_FILES = ['index.html'];

/**
 * Recursively copies a directory.
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Cleans and rebuilds the www/ directory.
 */
function build() {
  console.log('[build] Cleaning www/ ...');
  if (fs.existsSync(DEST)) {
    fs.rmSync(DEST, { recursive: true, force: true });
  }
  fs.mkdirSync(DEST, { recursive: true });

  // Copy directories
  for (const dir of COPY_DIRS) {
    const srcDir = path.join(SRC, dir);
    const destDir = path.join(DEST, dir);
    if (fs.existsSync(srcDir)) {
      console.log(`[build] Copying ${dir}/ ...`);
      copyDir(srcDir, destDir);
    } else {
      console.warn(`[build] Warning: ${dir}/ not found, skipping`);
    }
  }

  // Copy individual files
  for (const file of COPY_FILES) {
    const srcFile = path.join(SRC, file);
    const destFile = path.join(DEST, file);
    if (fs.existsSync(srcFile)) {
      console.log(`[build] Copying ${file} ...`);
      fs.copyFileSync(srcFile, destFile);
    } else {
      console.warn(`[build] Warning: ${file} not found, skipping`);
    }
  }

  console.log('[build] Done! Output in www/');
}

build();
