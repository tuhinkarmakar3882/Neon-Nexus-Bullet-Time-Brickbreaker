#!/usr/bin/env node
/** Ensure ios/App/App/Info.plist contains GADApplicationIdentifier for AdMob. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const plistPath = join(root, 'ios/App/App/Info.plist');
const appId = process.env.VITE_ADMOB_APP_ID_IOS ?? 'ca-app-pub-3940256099942544~1458002511';

if (!existsSync(plistPath)) {
  console.log('[patch-ios-admob-plist] ios/App/App/Info.plist not found — run: pnpm run cap:add:ios');
  process.exit(0);
}

let xml = readFileSync(plistPath, 'utf8');
if (xml.includes('GADApplicationIdentifier')) {
  xml = xml.replace(
    /<key>GADApplicationIdentifier<\/key>\s*<string>[^<]*<\/string>/,
    `<key>GADApplicationIdentifier</key>\n\t<string>${appId}</string>`,
  );
} else {
  xml = xml.replace(
    '</dict>\n</plist>',
    `\t<key>GADApplicationIdentifier</key>\n\t<string>${appId}</string>\n</dict>\n</plist>`,
  );
}
writeFileSync(plistPath, xml);
console.log('[patch-ios-admob-plist] GADApplicationIdentifier set');
