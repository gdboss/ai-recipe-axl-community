/**
 * Quality gates for the real site. These read the actual repo files,
 * so they fail if anyone (person or AI) drifts from the design system.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';
import { generate } from '../../tools/design-tokens/build-tokens.mjs';
import { flattenTokens, resolveToken } from '../../tools/design-tokens/lib.mjs';
import { contrastRatio } from '../../tools/design-tokens/contrast.mjs';
import { findUndefinedVars, findLintDisables } from '../../tools/design-tokens/css-audit.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const readJson = async (p) => JSON.parse(await readFile(`${root}${p}`, 'utf8'));

async function siteCss() {
  const blockDirs = await readdir(`${root}blocks`, { withFileTypes: true });
  const paths = [
    ...(await readdir(`${root}styles`)).filter((f) => f.endsWith('.css')).map((f) => `styles/${f}`),
    ...blockDirs.filter((d) => d.isDirectory()).map((d) => `blocks/${d.name}/${d.name}.css`),
  ];
  const files = await Promise.all(paths.map(async (path) => ({
    path, css: await readFile(`${root}${path}`, 'utf8').catch(() => null),
  })));
  return files.filter((f) => f.css !== null);
}

describe('design system gates', () => {
  it('styles.css matches tokens.json (run npm run tokens:build if this fails)', async () => {
    const { current, next } = await generate();
    assert.equal(current, next);
  });

  it('every contrast pair meets its WCAG minimum', async () => {
    const tokens = flattenTokens(await readJson('design-tokens/tokens.json'));
    const { pairs } = await readJson('design-tokens/contrast-pairs.json');
    assert.ok(pairs.length > 0, 'no contrast pairs defined');
    const failures = pairs
      .map((p) => ({
        ...p,
        ratio: contrastRatio(resolveToken(p.text, tokens), resolveToken(p.background, tokens)),
      }))
      .filter((p) => p.ratio < p.min)
      .map((p) => `${p.text} on ${p.background}: ${p.ratio.toFixed(2)} < ${p.min}`);
    assert.deepEqual(failures, []);
  });

  it('no CSS uses a variable that is not defined anywhere', async () => {
    assert.deepEqual(findUndefinedVars(await siteCss()), []);
  });

  it('no stylelint-disable comments outside the generated token region', async () => {
    const problems = (await siteCss()).flatMap(findLintDisables);
    assert.deepEqual(problems, []);
  });
});

describe('stylelint color rules (proves the lint gate catches violations)', () => {
  const lint = async (code) => {
    const { results } = await stylelint.lint({
      code,
      codeFilename: `${root}blocks/fixture/fixture.css`,
      configBasedir: root,
    });
    return results[0].warnings.map((w) => w.rule).sort();
  };

  it('rejects hex, named and functional colors', async () => {
    const rules = await lint('.fixture {\n  color: #dadada;\n  border-color: red;\n  background: rgb(0 0 0 / 50%);\n}\n');
    assert.deepEqual(rules, ['color-named', 'color-no-hex', 'function-disallowed-list']);
  });

  it('accepts token variables and CSS keywords', async () => {
    const rules = await lint('.fixture {\n  color: var(--color-text-default);\n  border: 1px solid currentcolor;\n  background: transparent;\n}\n');
    assert.deepEqual(rules, []);
  });
});
