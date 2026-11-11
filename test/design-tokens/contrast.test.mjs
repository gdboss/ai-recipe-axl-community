import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, hexToRgb } from '../../tools/design-tokens/contrast.mjs';

// Reference values match the WebAIM contrast checker.
describe('contrastRatio', () => {
  it('black on white is 21:1', () => {
    assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  });

  it('same color is 1:1', () => {
    assert.equal(contrastRatio('#3b63fb', '#3b63fb'), 1);
  });

  it('is symmetric', () => {
    assert.equal(contrastRatio('#ffffff', '#767676'), contrastRatio('#767676', '#ffffff'));
  });

  it('#767676 on white just passes AA (4.54)', () => {
    assert.equal(contrastRatio('#767676', '#ffffff').toFixed(2), '4.54');
  });

  it('#777777 on white just fails AA (4.48) and is not rounded up', () => {
    const ratio = contrastRatio('#777777', '#ffffff');
    assert.equal(ratio.toFixed(2), '4.48');
    assert.ok(ratio < 4.5);
  });

  it('accepts shorthand hex', () => {
    assert.deepEqual(hexToRgb('#fa0'), [255, 170, 0]);
    assert.equal(contrastRatio('#000', '#fff'), 21);
  });

  it('rejects non-hex input', () => {
    assert.throws(() => contrastRatio('white', '#000'), /Not a hex color/);
  });
});
