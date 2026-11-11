#!/usr/bin/env node
/**
 * Writes design-tokens/tokens.json into the marked region of styles/styles.css.
 *   npm run tokens:build   update styles.css
 *   npm run tokens:check   fail if styles.css is out of date (for CI)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { flattenTokens, buildCssLines, replaceRegion } from './lib.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const TOKENS = `${root}design-tokens/tokens.json`;
const STYLES = `${root}styles/styles.css`;

export async function generate() {
  const tokens = flattenTokens(JSON.parse(await readFile(TOKENS, 'utf8')));
  const current = await readFile(STYLES, 'utf8');
  return { current, next: replaceRegion(current, buildCssLines(tokens)), count: tokens.size };
}

async function main() {
  const check = process.argv.includes('--check');
  const { current, next, count } = await generate();
  if (check) {
    if (current !== next) {
      console.error('styles/styles.css is out of date with design-tokens/tokens.json. Run: npm run tokens:build');
      process.exit(1);
    }
    console.log(`Design tokens up to date (${count} tokens).`);
  } else if (current === next) {
    console.log(`No changes (${count} tokens).`);
  } else {
    await writeFile(STYLES, next);
    console.log(`Updated styles/styles.css (${count} tokens).`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
