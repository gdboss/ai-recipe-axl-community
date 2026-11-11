import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  flattenTokens, resolveToken, validateTokens, buildCssLines, replaceRegion, cssVarName, shortHex,
  START_MARKER, END_MARKER,
} from '../../tools/design-tokens/lib.mjs';

const sample = {
  color: {
    $type: 'color',
    neutral: { 0: { $value: '#FFFFFF' }, 900: { $value: '#111111' } },
    text: { default: { $value: '{color.neutral.900}' } },
  },
  space: { $type: 'dimension', m: { $value: '16px' } },
};

describe('flattenTokens', () => {
  it('flattens nested groups into dot paths and inherits $type', () => {
    const tokens = flattenTokens(sample);
    assert.deepEqual([...tokens.keys()], ['color.neutral.0', 'color.neutral.900', 'color.text.default', 'space.m']);
    assert.equal(tokens.get('space.m').type, 'dimension');
    assert.equal(tokens.get('color.text.default').type, 'color');
  });

  it('lets a token override the group $type', () => {
    const tokens = flattenTokens({ x: { $type: 'color', y: { $type: 'dimension', $value: '1px' } } });
    assert.equal(tokens.get('x.y').type, 'dimension');
  });

  it('rejects names that would make invalid CSS variables', () => {
    assert.throws(() => flattenTokens({ color: { $type: 'color', 'Brand Blue': { $value: '#000' } } }), /Invalid token name/);
  });

  it('rejects missing or unsupported $type', () => {
    assert.throws(() => flattenTokens({ a: { $value: '#000' } }), /unsupported \$type "undefined"/);
    assert.throws(() => flattenTokens({ a: { $type: 'shadow', $value: 'x' } }), /unsupported \$type "shadow"/);
  });
});

describe('resolveToken', () => {
  it('follows alias chains to the literal value', () => {
    const tokens = flattenTokens({
      c: {
        $type: 'color', a: { $value: '#123456' }, b: { $value: '{c.a}' }, d: { $value: '{c.b}' },
      },
    });
    assert.equal(resolveToken('c.d', tokens), '#123456');
  });

  it('reports missing alias targets with the referencing token', () => {
    const tokens = flattenTokens({ c: { $type: 'color', a: { $value: '{c.nope}' } } });
    assert.throws(() => resolveToken('c.a', tokens), /Unknown token "c.nope" \(referenced by "c.a"\)/);
  });

  it('detects alias loops', () => {
    const tokens = flattenTokens({ c: { $type: 'color', a: { $value: '{c.b}' }, b: { $value: '{c.a}' } } });
    assert.throws(() => resolveToken('c.a', tokens), /Alias loop: c.a -> c.b -> c.a/);
  });

  it('rejects aliases across types', () => {
    const tokens = flattenTokens({
      c: { $type: 'color', a: { $value: '{s.m}' } }, s: { $type: 'dimension', m: { $value: '4px' } },
    });
    assert.throws(() => resolveToken('c.a', tokens), /\(color\) points to "s.m" \(dimension\)/);
  });
});

describe('validateTokens', () => {
  it('accepts valid colors and dimensions', () => {
    assert.doesNotThrow(() => validateTokens(flattenTokens(sample)));
  });

  ['red', 'rgb(0,0,0)', '#12345', '#gggggg'].forEach((bad) => {
    it(`rejects color value ${bad}`, () => {
      const tokens = flattenTokens({ c: { $type: 'color', a: { $value: bad } } });
      assert.throws(() => validateTokens(tokens), /is not a #rgb or #rrggbb color/);
    });
  });

  ['16', '1.5vw', 'calc(1px + 2px)', ''].forEach((bad) => {
    it(`rejects dimension value "${bad}"`, () => {
      const tokens = flattenTokens({ s: { $type: 'dimension', a: { $value: bad } } });
      assert.throws(() => validateTokens(tokens), /is not a px, rem or em value/);
    });
  });

  it('lists every problem at once, not just the first', () => {
    const tokens = flattenTokens({ c: { $type: 'color', a: { $value: 'red' }, b: { $value: 'blue' } } });
    assert.throws(() => validateTokens(tokens), (e) => e.message.includes('c.a') && e.message.includes('c.b'));
  });
});

describe('buildCssLines', () => {
  it('outputs lowercase literals and keeps aliases as var() references', () => {
    assert.deepEqual(buildCssLines(flattenTokens(sample)), [
      '--color-neutral-0: #fff;',
      '--color-neutral-900: #111;',
      '--color-text-default: var(--color-neutral-900);',
      '--space-m: 16px;',
    ]);
  });

  it('shortens hex only when every pair repeats', () => {
    assert.equal(shortHex('#AABBCC'), '#abc');
    assert.equal(shortHex('#2f5bd3'), '#2f5bd3');
    assert.equal(shortHex('#abc'), '#abc');
  });

  it('maps dot paths to CSS variable names', () => {
    assert.equal(cssVarName('color.text.link-hover'), '--color-text-link-hover');
  });
});

describe('replaceRegion', () => {
  const css = `:root {\n  --keep: 1px;\n  ${START_MARKER}\n  --old: red;\n  ${END_MARKER}\n}\n`;

  it('replaces only the marked region and keeps indentation', () => {
    const out = replaceRegion(css, ['--new: #000;']);
    assert.match(out, /--keep: 1px;/);
    assert.doesNotMatch(out, /--old/);
    assert.match(out, /\n {2}--new: #000;\n/);
    assert.ok(out.endsWith(`--new: #000;\n  /* stylelint-enable color-no-hex */\n\n  ${END_MARKER}\n}\n`));
  });

  it('is idempotent', () => {
    const once = replaceRegion(css, ['--new: #000;']);
    assert.equal(replaceRegion(once, ['--new: #000;']), once);
  });

  it('fails clearly when markers are missing or duplicated', () => {
    assert.throws(() => replaceRegion(':root {}', []), /needs exactly one pair/);
    assert.throws(() => replaceRegion(`${css}${START_MARKER}`, []), /needs exactly one pair/);
  });
});
