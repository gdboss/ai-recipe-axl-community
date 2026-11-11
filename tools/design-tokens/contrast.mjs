/**
 * WCAG 2.2 contrast ratio, as defined in
 * https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 * Ratios are compared unrounded: 4.49 fails a 4.5 minimum.
 */

export function hexToRgb(hex) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Not a hex color: "${hex}"`);
  const digits = match[1].length === 3
    ? match[1].split('').map((d) => d + d).join('')
    : match[1];
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
}

export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground, background) {
  const [light, dark] = [relativeLuminance(foreground), relativeLuminance(background)]
    .sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}
