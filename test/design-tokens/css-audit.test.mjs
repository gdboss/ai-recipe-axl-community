import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findUndefinedVars, findLintDisables, stripComments } from '../../tools/design-tokens/css-audit.mjs';
import { START_MARKER, END_MARKER } from '../../tools/design-tokens/lib.mjs';

describe('findUndefinedVars', () => {
  it('passes when every var() is defined in some file', () => {
    const files = [
      { path: 'styles.css', css: ':root { --a: 1px; }' },
      { path: 'block.css', css: '.b { margin: var(--a); }' },
    ];
    assert.deepEqual(findUndefinedVars(files), []);
  });

  it('flags a made-up variable with file and line', () => {
    const files = [{ path: 'block.css', css: '.b {\n  color: var(--color-brand-primary);\n}' }];
    assert.deepEqual(findUndefinedVars(files), [{ file: 'block.css', line: 2, name: '--color-brand-primary' }]);
  });

  it('allows var() with a fallback', () => {
    assert.deepEqual(findUndefinedVars([{ path: 'x.css', css: '.b { color: var(--maybe, inherit); }' }]), []);
  });

  it('ignores definitions and usages inside comments', () => {
    const files = [{ path: 'x.css', css: '/* --a: 1px; */\n.b { margin: var(--a); }\n/* var(--ghost) */' }];
    assert.deepEqual(findUndefinedVars(files).map((p) => p.name), ['--a']);
  });

  it('keeps line numbers correct after multi-line comments', () => {
    assert.equal(stripComments('/* a\nb */x').split('\n').length, 2);
  });
});

describe('findLintDisables', () => {
  it('flags disables of the colour rules', () => {
    const css = '.b {\n  /* stylelint-disable-next-line color-no-hex */\n  color: #fff;\n}';
    assert.deepEqual(findLintDisables({ path: 'b.css', css }), [{ file: 'b.css', line: 2 }]);
  });

  it('flags a guarded rule hidden in a list, and blanket disables', () => {
    const css = '/* stylelint-disable max-line-length, color-named */\n/* stylelint-disable */\n/* stylelint-disable-line -- no reason */';
    assert.deepEqual(findLintDisables({ path: 'b.css', css }).map((p) => p.line), [1, 2, 3]);
  });

  it('ignores disables of unrelated rules, and descriptions that mention a rule', () => {
    const css = '/* stylelint-disable max-line-length */\n/* stylelint-disable no-empty-source -- not color-no-hex */';
    assert.deepEqual(findLintDisables({ path: 'b.css', css }), []);
  });

  it('allows the colour disable inside the generated token region only', () => {
    const css = `:root {\n${START_MARKER}\n/* stylelint-disable color-no-hex */\n${END_MARKER}\n}\n/* stylelint-disable color-no-hex */`;
    assert.deepEqual(findLintDisables({ path: 's.css', css }), [{ file: 's.css', line: 6 }]);
  });
});
