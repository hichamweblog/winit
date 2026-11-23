#!/usr/bin/env node
/** Static regression checks for the installable-app contract. */
import fs from 'node:fs';

const fail = [];
const pass = [];
const check = (name, condition, detail) => (condition ? pass : fail).push(`${condition ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
const manifestSource = fs.readFileSync('src/app/manifest.ts', 'utf8');
const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
const worker = fs.readFileSync('public/sw.js', 'utf8');
const registration = fs.readFileSync('src/app/components/PwaRegister.tsx', 'utf8');
const installUi = fs.readFileSync('src/app/components/PwaInstall.tsx', 'utf8');
const offline = fs.readFileSync('public/offline.html', 'utf8');
const manifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));

check('manifest route is linked', layout.includes("manifest: '/manifest.webmanifest'") && manifestSource.includes("display: 'standalone'"));
check('manifest includes install icons', manifestSource.includes("sizes: '192x192'") && manifestSource.includes("sizes: '512x512'") && manifestSource.includes("purpose: 'maskable'"));
check('manifest icon files exist', manifest.icons.every((icon) => fs.existsSync(`public${icon.src}`)), `${manifest.icons.length} icons`);
check('install controls handle browser and iOS flows', installUi.includes("beforeinstallprompt") && installUi.includes('iPhone أو iPad') && installUi.includes("appinstalled"));
check('service worker registration works after load', registration.includes("document.readyState === 'complete'") && registration.includes("register('/sw.js'"));
check('worker precaches offline page but not user HTML', worker.includes("'/offline.html'") && !worker.includes("'/'") && worker.includes("request.mode === 'navigate'"));
check('worker bypasses API requests', worker.includes("url.pathname.startsWith('/api/')") && !/cache\.put\(request, clone\)/.test(worker));
check('offline page offers an explicit retry', offline.includes('location.reload()') && offline.includes('winit-language'));

console.log(`PWA gate: ${pass.length}/${pass.length + fail.length} checks passed`);
for (const line of [...pass, ...fail]) console.log(`  ${line}`);
if (fail.length) process.exit(1);
