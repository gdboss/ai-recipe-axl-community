---
name: apply-design-tokens
description: Apply the design tokens in design-tokens/tokens.json to this Edge Delivery Services site. Regenerates the token CSS, replaces hard-coded colors in styles/ and blocks/ with token variables, and loops until `npm run verify` passes. Use when tokens.json changes, when block CSS is added or edited, or when asked to "tokenize", "apply the design system" or "fix design token violations".
---

# Apply design tokens

You map hard-coded CSS values to design tokens. Scripts decide whether the result is correct; you never decide that yourself. Done means `npm run verify` exits 0 **and** the report below is complete.

## Files

| File | Who owns it | You may edit it? |
|---|---|---|
| `design-tokens/tokens.json` | Design | No. Propose changes in the report. |
| `design-tokens/contrast-pairs.json` | Design | No |
| `styles/styles.css` between the `design-tokens:start/end` markers | Generator | No. Only through `npm run tokens:build`. |
| `styles/styles.css` everything else, `blocks/**/*.css` | Developers | Yes, this is your job |
| `test/**`, `tools/**`, `.stylelintrc.json`, `.eslintrc.js`, `package.json` | Quality gates | **Never** |
| `scripts/aem.js` | Adobe (vendored) | **Never** |

## Steps

1. **Baseline.** Run `npm run verify` and keep the output. List every `color-no-hex`, `color-named` and `function-disallowed-list` error. That list is your work queue.
2. **Generate.** Run `npm run tokens:build`.
3. **Map each value by role, not by nearest hex.** Read the selector and property first. Ask what the value is *for* (body text, a border, a section background) and pick the token for that role.
   - **Legacy variables in `:root`** (`--background-color`, `--text-color`, `--link-color`, etc.): keep the names, because blocks and the boilerplate use them. Point them at semantic tokens, e.g. `--link-color: var(--color-text-link);`. Don't rename or delete them in this pass.
   - **Block CSS**: use semantic tokens (`--color-text-*`, `--color-surface-*`, `--color-border-*`) or the legacy variables. Never use primitives (`--color-neutral-*`, `--color-brand-*`) in a block.
   - **Keywords** (`transparent`, `currentcolor`, `inherit`) are fine. Leave them.
4. **No fitting token? Stop on that value.** Don't invent a variable name, don't reuse a token for a different role because the hex is close, and don't edit `tokens.json`. Leave the line unchanged and add it to *Needs a design decision* in the report, with a suggested token name and value.
5. **Check colour pairs.** For each legacy variable you remapped, find where it's used as text on another variable's background (`grep -rn "var(--<name>)" styles blocks`). If that token pair isn't in `contrast-pairs.json`, list it in the report under *Contrast pairs to add*.
6. **Verify.** Run `npm run verify`. If it fails, read the error, fix the CSS, and run it again. After **3 failed attempts**, stop and report what's still failing. Don't keep guessing.
7. **Report** in this format:

```
## Design token report
Violations: <before> -> <after>      npm run verify: PASS | FAIL

| File:line | Before | After | Old value -> New value | Why this token |
|---|---|---|---|---|

### Visual changes for review
<every place where the resolved colour changed, old hex -> new hex>

### Needs a design decision
<values left alone, with suggested token>

### Contrast pairs to add
<pairs, or "none">
```

## Not allowed (these are cheating, not fixing)

- Adding `stylelint-disable` comments for colour rules. A test fails if you do.
- Editing tests, lint config, contrast pairs or the generated region to get a pass.
- Hiding a made-up variable behind a fallback, e.g. `var(--color-brand-accent, var(--link-color))`.
- Converting colours to a format the linter doesn't catch.

## Before opening a pull request

- Run `npx -y @adobe/aem-cli up` and check the pages that use the changed blocks, especially everything listed under *Visual changes for review*.
- The PR description must include the `{branch}--{repo}--{owner}.aem.page/{path}` preview link (see AGENTS.md). If your repo runs the AEM PageSpeed check on pull requests, it should still score 100.
