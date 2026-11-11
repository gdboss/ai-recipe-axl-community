/**
 * Static checks across the site's CSS that stylelint can't do on its own,
 * because they need to look at more than one file at a time.
 */
import { regionBounds } from './lib.mjs';

/** Blanks out comments but keeps line breaks, so line numbers stay correct. */
export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

const lineOf = (css, index) => css.slice(0, index).split('\n').length;

/**
 * Finds var(--x) calls where --x is defined in none of the given files.
 * A var() with a fallback, e.g. var(--x, red), is allowed.
 * files: [{ path, css }]
 */
export function findUndefinedVars(files) {
  const defined = new Set();
  files.forEach(({ css }) => {
    Array.from(stripComments(css).matchAll(/(--[\w-]+)\s*:/g)).forEach((m) => defined.add(m[1]));
  });
  const problems = [];
  files.forEach(({ path, css }) => {
    const clean = stripComments(css);
    Array.from(clean.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g))
      .filter((m) => !m[2] && !defined.has(m[1]))
      .forEach((m) => problems.push({ file: path, line: lineOf(clean, m.index), name: m[1] }));
  });
  return problems;
}

export const GUARDED_RULES = ['color-no-hex', 'color-named', 'function-disallowed-list'];

/**
 * Finds stylelint-disable comments that switch off the colour rules (or all rules),
 * anywhere except the generated token region. This stops anyone, person or AI,
 * from silencing the design system checks instead of fixing the CSS.
 * Disables for unrelated rules (e.g. max-line-length) are left alone.
 */
export function findLintDisables({ path, css }) {
  const bounds = regionBounds(css);
  const pattern = /\/\*\s*stylelint-disable(?:-next-line|-line)?\b([\s\S]*?)\*\//g;
  return Array.from(css.matchAll(pattern))
    .filter((m) => !(bounds && m.index > bounds.start && m.index < bounds.end))
    .filter((m) => {
      const rules = m[1].split('--')[0].split(',').map((r) => r.trim()).filter(Boolean);
      return rules.length === 0 || rules.some((r) => GUARDED_RULES.includes(r));
    })
    .map((m) => ({ file: path, line: lineOf(css, m.index) }));
}
