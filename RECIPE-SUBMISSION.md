# AI Recipe Library submission

Final text for the Adobe Experience League AI Recipe Library form, field by field.

## Build Type
Workflow

## Title
Design token guardrails for Edge Delivery Services, enforced while Claude Code writes your CSS

## Overview
AI coding tools are fast at writing Edge Delivery Services block CSS, but they quietly break the design system: a hard-coded #dadada here, a made-up var(--color-brand-accent) there, and sometimes a stylelint-disable comment to make the error go away.

This recipe splits the work between AI and scripts:

- Design tokens live in one tokens.json file (W3C DTCG format). A small Node script writes them into styles/styles.css as CSS variables. There's no runtime build step, nothing extra ships to the browser, and authoring in Document Authoring / Experience Workspace is unchanged.
- Quality gates in "npm run verify" (Stylelint, ESLint, Node's built-in test runner) fail the build when anyone hard-codes a color, uses a variable that doesn't exist, hand-edits the generated CSS, disables the color lint rules, or picks token colors that fail WCAG AA contrast.
- A Claude Code skill (/apply-design-tokens) does the judgement work. It maps each hard-coded value to the right token by role, not by nearest hex. It loops until the gates pass, stops after 3 failed attempts, and writes a report listing every visual change and anything that needs a design decision.

The AI proposes; the scripts decide. The same gates run in GitHub Actions on every push, so they also protect against hand-written CSS.

Workflow diagram: https://github.com/gdboss/ai-recipe-axl-community/blob/main/design-tokens/workflow.png

## Goals + Results
Goal: let developers use Claude Code on EDS blocks without design-system drift reaching production.

Results on my own EDS site (boilerplate-based, with a custom dark neon hero variant). The sample repo reproduces the same run, with before and after branches:
- 13 hard-coded colors (global styles, cards block, hero variant) moved onto 32 design tokens. The gates went from failing to passing.
- Zero visual change, proven in a browser: every computed color on 32 test elements (hover states included) was identical, and the before/after full-page screenshots were byte-for-byte the same.
- Lighthouse performance stayed at 100 on mobile and desktop on my site's preview.
- 46 automated tests; the full gate runs in about 4 seconds.
- 5 deliberate "cheats" (lint-disable comment, invented token, hand-edited generated CSS, low-contrast token, color written in hsl()) were all caught.
- Zero runtime dependencies. Only CSS variables ship to the browser.

## Lessons learned
- Don't let the AI grade its own work. In my test, a stylelint-disable comment made the linter pass. Only a separate test that scans for color-rule disables caught it. Guard the guardrails.
- Hallucinated tokens are the most common AI failure. var(--color-brand-accent) looks right and fails silently in the browser. A cross-file "is this variable defined anywhere?" check is cheap and catches it.
- Map by role, not by nearest hex. #dadada is a border, so it gets --color-border-subtle, even if a text gray is closer in value. Spell this out in the skill or the AI picks by color distance.
- Give the AI a way to stop. "If no token fits, leave it and report it" works better than letting it invent tokens. On my site, the skill flagged six neon hero colors as "needs a design decision", I approved new tokens, and a second pass finished the job.
- Start with your current colors as token values. The first pass then changes nothing visually, so reviewers only confirm that nothing moved. Rebrand later by editing one JSON file.
- Keep legacy variable names (--link-color etc.) and point them at tokens. Existing blocks keep working and the diff stays small.
- Tighten one category at a time. Start with colors. Spacing tokens are generated but not enforced yet, because block CSS legitimately uses px for borders and breakpoints.
- Passing gates prove consistency, not good looks. Always review the aem.page preview link.

## Instructions / Workflow
Leave "Show Copy button" off: these are steps, not a single prompt.

```
Full code, tests and README: https://github.com/gdboss/ai-recipe-axl-community

1. SET UP (once, about 10 minutes)
   Copy into your EDS repo: design-tokens/, tools/design-tokens/, test/design-tokens/ and .claude/skills/apply-design-tokens/. Merge the package.json scripts, .stylelintrc.json rules, .eslintrc.js overrides and .hlxignore lines.
   Add the two design-tokens marker comments at the top of :root in styles/styles.css.

2. DEFINE TOKENS
   Put your current site colors in design-tokens/tokens.json. Using current values means the first run changes nothing visually.
   List the text/background pairs your site uses in contrast-pairs.json.

3. BASELINE
   Run: npm install && npm run verify
   It fails and lists every hard-coded color. That's your to-do list.

4. LET CLAUDE CODE DO THE WORK
   In Claude Code, from the repo root, run: /apply-design-tokens
   Claude maps each color to a token by its role, re-runs the checks until they pass, and writes a report.

5. MAKE THE DESIGN DECISIONS
   Read "Needs a design decision" in the report. Approve or adjust any new tokens, then run /apply-design-tokens again.

6. REVIEW
   Run: npx -y @adobe/aem-cli up
   Check every page listed under "Visual changes for review".

7. SHIP
   Open a pull request with the {branch}--{repo}--{owner}.aem.page preview link.
   GitHub Actions runs npm run verify on every push from now on.

Optional: run the 5 "prove the gates work" commands in the README to see each shortcut get caught.
```

## Sample asset or link
https://github.com/gdboss/ai-recipe-axl-community

## Setup requirements
- An Edge Delivery Services site in GitHub (based on aem-boilerplate), with Document Authoring or another content source
- Claude Code (Claude Pro, Max, Team or Enterprise plan, or an API key)
- Node.js 22 or later
- Your design system's color values (the sample token file uses the boilerplate's default colors plus a neon accent set)

## Tags
- Use case: the closest match to design system or development in the dropdown
- Role / function: Developer
- Adobe products used: Experience Manager
- AI platforms used: Claude
