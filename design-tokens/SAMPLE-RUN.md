# Sample run: `/apply-design-tokens`

Site: the `aem-boilerplate` with a custom dark neon "terminal" hero variant. This run was first done on my own EDS site and reproduced in this repo.

- Before: tag [`sample-run-before`](https://github.com/gdboss/ai-recipe-axl-community/tree/sample-run-before)
- After: tag [`sample-run-after`](https://github.com/gdboss/ai-recipe-axl-community/tree/sample-run-after)
- Diff: [before → after](https://github.com/gdboss/ai-recipe-axl-community/compare/sample-run-before...sample-run-after)

Goal: move every color onto design tokens **without changing how the site looks**, so token values were set to the site's existing colors.

Baseline `npm run verify`: **FAIL**, with 13 Stylelint color errors (7 in global styles and the cards block, 6 in the terminal hero).

## Design token report
Violations: 13 -> 0      npm run verify: PASS (46/46 tests, ~4 s)

| File | Before | After | Why this token |
|---|---|---|---|
| styles/styles.css | `--background-color: white` | `var(--color-surface-default)` | Page background |
| styles/styles.css | `--light-color: #f8f8f8` | `var(--color-surface-subtle)` | Section, footer, secondary button background |
| styles/styles.css | `--dark-color: #505050` | `var(--color-text-muted)` | Text on light surfaces (secondary buttons) |
| styles/styles.css | `--text-color: #131313` | `var(--color-text-default)` | Body text |
| styles/styles.css | `--link-color: #3b63fb` | `var(--color-text-link)` | Links, primary button |
| styles/styles.css | `--link-hover-color: #1d3ecf` | `var(--color-text-link-hover)` | Link and primary button hover |
| blocks/cards/cards.css | `border: 1px solid #dadada` | `var(--color-border-subtle)` | Decorative card border |
| blocks/hero/hero.css | `--hero-terminal-bg: #0a0a0f` | `var(--color-terminal-surface)` | Terminal hero background |
| blocks/hero/hero.css | `--hero-terminal-text: #fff` | `var(--color-terminal-text)` | Terminal heading and strong text |
| blocks/hero/hero.css | `--hero-terminal-muted: #9aa0b0` | `var(--color-terminal-text-muted)` | Terminal body copy |
| blocks/hero/hero.css | `--hero-terminal-cyan: #00e5ff` | `var(--color-terminal-accent)` | Eyebrow pill, links |
| blocks/hero/hero.css | `--hero-terminal-magenta: #ff1f8e` | `var(--color-terminal-highlight)` | Callout border |
| blocks/hero/hero.css | `background: rgb(255 31 142 / 6%)` | `color-mix(in srgb, var(--hero-terminal-magenta) 6%, transparent)` | Callout tint, now derived from the token |

### Visual changes for review
None. Checked in Chromium by rendering a test page (body, links, buttons, cards, footer, terminal hero) with the old and the new CSS:
- 32 elements: every computed color identical, including hover states.
- Full-page screenshots: byte-for-byte identical.

### Needs a design decision
First pass: the six terminal hero colors had no matching tokens, so the skill left them alone and reported them. Design approved adding them as `color.ink.*` / `color.neon.*` primitives with `color.terminal.*` semantic tokens, and the second pass applied them.

### Contrast pairs added
Terminal text, muted text and cyan accent on the terminal background, all above 4.5:1. Not testable automatically: the callout's text on its 6% magenta tint (a blend). Checked by eye.

## Gate check: deliberate breakage

Each change below was applied on its own to the passing branch. `npm run verify` failed every time:

| Attempt | Caught by |
|---|---|
| `#dadada` + `stylelint-disable-line color-no-hex` in cards.css (Stylelint alone passes!) | Repo test: no color-rule disables |
| `var(--color-border-strong)` (doesn't exist) | Repo test: undefined variables |
| Hand-edited `--color-brand-500` in the generated block | `tokens:check` |
| `neutral.600` changed to #9aa0aa | Contrast test: 2.63 < 4.5 |
| `hsl(0deg 0% 85%)` in cards.css | Stylelint `function-disallowed-list` |
