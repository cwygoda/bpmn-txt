# BPMN-TXT

Text DSL for BPMN 2.0 — human-readable process definitions.

## Project Structure

- `src/` — Core parser, compiler, layout engine (TypeScript, ESM)
- `docs/` — Documentation site (SvelteKit 2, static deploy to GitHub Pages)
- `vscode-bpmn-txt/` — VS Code extension (LSP, syntax highlighting, live preview)
- `test/` — Vitest test suite

## Design Context

### Users

Process engineers and developers who prefer text/code over graphical BPMN editors. They arrive at the docs site and playground in three modes:

1. **Evaluating** — deciding whether to adopt bpmn-txt
2. **Learning** — working through the DSL for the first time
3. **Referencing** — looking up syntax/features mid-work

All three stages are equally important. The interface must sell on first visit, teach effectively, and stay out of the way during daily use.

### Brand Personality

**Technical. Elegant. Authoritative.**

- Voice: expert-level, concise, zero fluff
- Tone: confident without arrogance — the tool speaks for itself
- Emotion: trust, clarity, professional respect for the user's time

### Aesthetic Direction

- **Visual tone**: Refined technical documentation — clean lines, generous whitespace, precise typography
- **References**: VitePress/Vue docs (clean nav, great code blocks, approachable structure) + Stripe docs (polished, precise information hierarchy)
- **Anti-references**: Cluttered enterprise UIs, playful/cartoon aesthetics, heavy marketing sites
- **Theme**: Light + dark mode (system preference), both fully supported
- **Brand color**: `#3b82f6` (Tailwind Blue-500) — used sparingly for accents, CTAs, and the logo
- **Typography**: System font stacks (no web fonts). Monospace for all code. Clear weight hierarchy.
- **Spacing**: 8px base grid (0.5rem) with consistent 2x/4x/6x multipliers

### Design Principles

1. **Clarity over decoration** — Every element earns its place. No ornamental UI. Information hierarchy drives layout.
2. **Code is the hero** — Syntax examples, the playground, and code blocks are first-class citizens. They get the best rendering, spacing, and attention.
3. **Respect the reader's time** — Scannable structure, concise copy, fast navigation. Users should find what they need in seconds.
4. **Accessible by default** — WCAG AAA compliance. Reduced motion support. High contrast in both themes. Keyboard-navigable throughout.
5. **System-native feel** — System fonts, native scrolling, platform conventions. Feels like a tool, not a website.

### Design Tokens (Reference)

```css
/* Brand */
--c-brand: #3b82f6;
--c-brand-light: #60a5fa;

/* Light mode */
--c-bg: #ffffff;
--c-bg-soft: #f6f6f7;
--c-text: #213547;
--c-text-light: #6b7280;
--c-border: #e5e7eb;

/* Dark mode */
--c-bg: #1a1a1a;
--c-bg-soft: #242424;
--c-text: #ffffffde;
--c-text-light: #9ca3af;
--c-border: #374151;

/* Typography */
--font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
```
