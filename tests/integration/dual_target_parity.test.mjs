import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

describe('Integration Test Suite: PWA Offline Manifest, Service Worker & Dual-Target Parity (REQ-009, REQ-010)', () => {
  test('DT-01: W3C Web App Manifest is valid and references existing PNG icons', () => {
    const manifestPath = path.join(rootDir, 'manifest.json');
    assert.equal(fs.existsSync(manifestPath), true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.short_name, 'AquaPulse');
    assert.equal(manifest.display, 'standalone');
    assert.equal(Array.isArray(manifest.icons), true);
    assert.equal(manifest.icons.length >= 2, true);

    for (const icon of manifest.icons) {
      assert.equal(fs.existsSync(path.join(rootDir, icon.src)), true, `Missing icon: ${icon.src}`);
    }
  });

  test('DT-02: Service Worker implements versioned cache, skipWaiting(), and clients.claim() (Rule 6)', () => {
    const swPath = path.join(rootDir, 'sw.js');
    assert.equal(fs.existsSync(swPath), true);

    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.match(swContent, /const CACHE_NAME = 'water-tracker-cache-v1\.0\.0'/);
    assert.match(swContent, /self\.skipWaiting\(\)/);
    assert.match(swContent, /self\.clients\.claim\(\)/);
  });

  test('DT-03: Native Android wrapper project is configured for both APK and Google Play AAB', () => {
    const gradleFile = path.join(rootDir, 'android', 'app', 'build.gradle.kts');
    const mainActivityFile = path.join(rootDir, 'android', 'app', 'src', 'main', 'kotlin', 'com', 'waterintaketracker', 'app', 'MainActivity.kt');
    assert.equal(fs.existsSync(gradleFile), true);
    assert.equal(fs.existsSync(mainActivityFile), true);

    const gradleContent = fs.readFileSync(gradleFile, 'utf8');
    assert.match(gradleContent, /applicationId = "com\.sumantmarathe\.waterintaketracker"/);

    const activityContent = fs.readFileSync(mainActivityFile, 'utf8');
    assert.match(activityContent, /domStorageEnabled = true/);
    assert.match(activityContent, /file:\/\/\/android_asset\/www\/index\.html/);
  });

  test('DT-04: Synchronized Android assets match root Web assets with 100% byte parity', () => {
    const assetsDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'www');
    assert.equal(fs.existsSync(assetsDir), true, 'Android www assets directory must exist');

    const filesToCompare = [
      'index.html',
      'privacy.html',
      'manifest.json',
      'sw.js',
      'css/style.css',
      'js/app.js',
      'js/waterLogic.js',
      'js/storage.js'
    ];

    for (const relPath of filesToCompare) {
      const webFile = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
      const androidFile = fs.readFileSync(path.join(assetsDir, relPath), 'utf8');
      assert.equal(webFile, androidFile, `Parity mismatch in ${relPath}`);
    }
  });
});
