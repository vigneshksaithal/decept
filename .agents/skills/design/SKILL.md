---
name: design
description: Design consistency and visual styling for the Svelte client UI. Use when creating or modifying visual elements, colors, typography, buttons, inputs, or cards.
---

# Design

> All code must follow the **Coding Principles** in AGENTS.md (functional, minimal, readable, modular).

## Design thinking

Before writing any UI code, answer these questions:

1. **Purpose** — What problem does this screen solve? What action should the user take?
2. **Tone** — What should this feel like? Pick a direction and commit: playful, minimal, bold, editorial, retro, raw, refined. Don't land in the middle.
3. **Constraints** — Fixed Devvit webview canvas (min 320×320, no scroll). Mobile-first. Tailwind only.
4. **Memorability** — What's the one detail someone remembers? A color choice, an animation, a layout decision. Every screen should have at least one intentional moment.

Design with intention, not defaults. A bold palette and a restrained palette both work — what doesn't work is an accidental one.

---

## Aesthetic identity

Avoid generic AI-generated aesthetics:
- No safe, forgettable color schemes (muted grays on white with a single blue accent)
- No cookie-cutter component layouts that look like every other app
- No design choices made by default rather than by decision

Instead:
- Commit to a cohesive visual direction and carry it through every element
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes
- Let the context drive the aesthetic — a game screen feels different from a results screen
- Vary between screens where it serves the experience. Not everything needs to look the same.
- Match implementation effort to the vision: a maximalist design needs elaborate detail, a minimal design needs precise restraint

---

## Core principles

- No scrolling — ever. The webview is a fixed sandboxed canvas (min 320×320px).
- Mobile-first. Design for the smallest viewport, then scale up.
- Tailwind only. No `<style>` blocks, no inline `style=` attributes.
- Every visual element should serve the user — but "serve" includes delight, not just function.

---

## Spacing scale

Use Tailwind's default spacing scale. Avoid arbitrary values (`p-[13px]`).

| Use case | Class |
|----------|-------|
| Component padding | `p-4` (16px) |
| Section gap | `gap-4` or `space-y-4` |
| Tight inline gap | `gap-2` |
| Card/panel padding | `p-4` or `p-6` |
| Page horizontal padding | `px-4` |
| Page vertical padding | `py-3` |

Consider spatial composition: asymmetry, generous negative space, and unexpected proportions can make a layout feel designed rather than assembled.

---

## Typography

```svelte
<h1 class="text-xl font-bold tracking-tight">Title</h1>
<h2 class="text-base font-semibold">Section</h2>
<p  class="text-sm text-gray-700 dark:text-gray-300">Body</p>
<span class="text-xs text-gray-500">Caption / meta</span>
```

- Base body size: `text-sm` (14px). Never below `text-xs` for readable content.
- Line length: `max-w-sm` or `max-w-xs` for prose.
- Use Tailwind's default system font stack unless a custom font genuinely elevates the design. If adding a Google Font, keep it to one family (loaded via `<link>` in `index.html`) and pair it with the system stack for body text.
- Typography should feel intentional. Vary weight, size, tracking, and case to create clear hierarchy — don't rely on size alone.

---

## Color

| Role | Light | Dark |
|------|-------|------|
| Background | `bg-white` | `dark:bg-gray-900` |
| Surface / card | `bg-gray-50` | `dark:bg-gray-800` |
| Border | `border-gray-200` | `dark:border-gray-700` |
| Primary text | `text-gray-900` | `dark:text-gray-100` |
| Secondary text | `text-gray-500` | `dark:text-gray-400` |
| Accent / brand | `text-orange-500` | same |
| Destructive | `text-red-500` | same |
| Success | `text-green-500` | same |

Always pair a light and dark variant. Reddit renders in both modes.

Beyond the defaults: when the design calls for it, build a bolder palette. Use Tailwind's full color range — amber, rose, cyan, violet, emerald. Pick a dominant color and a sharp accent rather than spreading color evenly. Define custom colors in `tailwind.config` if the built-in palette doesn't match the vision.

---

## Backgrounds & atmosphere

Don't default to flat solid backgrounds. Consider:
- Subtle gradients (`bg-gradient-to-br from-gray-50 to-gray-100`)
- Layered transparency and overlapping elements for depth
- Tailwind's ring and shadow utilities to create visual layers
- Color washes or tinted surfaces that set mood

Keep it performant — CSS-only, no images unless essential. The goal is atmosphere without weight.

---

## Buttons

```svelte
<!-- Primary -->
<button class="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white
               hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50
               disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-orange-400">
  Submit
</button>

<!-- Secondary -->
<button class="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5
               text-sm font-semibold text-gray-700 dark:text-gray-200
               hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all">
  Cancel
</button>
```

- Minimum tap target: `min-h-[44px]` or `py-2.5` on `text-sm`.
- Always include `disabled:opacity-50 disabled:cursor-not-allowed`.
- Always include `active:scale-95 transition-all` for tactile feedback.

---

## Inputs

```svelte
<input
  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white
         dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100
         placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
/>
```

---

## UI states

Every data-driven component must handle all four states:

| State | Pattern |
|-------|---------|
| Loading | `animate-pulse` skeleton or spinner with label |
| Error | Red tinted surface, human-readable message |
| Empty | Neutral muted text, optionally a CTA |
| Success | Normal render; optionally brief `text-green-500` confirmation |

---

## Cards & surfaces

```svelte
<div class="rounded-xl border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 p-4 shadow-sm">
  <!-- content -->
</div>
```

- `rounded-xl` for cards, `rounded-lg` for inputs/buttons, `rounded-md` for badges.
- `shadow-sm` only — avoid heavy shadows unless the design direction calls for dramatic depth.
- Max two surface levels deep (page → card → no deeper).

---

## Animation & motion

Defaults for utility interactions:
- `transition-all`, `transition-colors`, `transition-opacity` with default duration (`150ms`).
- `animate-pulse` for loading, `animate-spin` for spinners.
- `active:scale-95` for tactile button feedback.

For high-impact moments (screen transitions, reveals, celebrations):
- Use Tailwind's `animate-` utilities or `@keyframes` in `app.css` when built-in classes aren't enough.
- Focus effort on one or two well-orchestrated moments per screen rather than scattering micro-interactions everywhere.
- Staggered reveals (`animation-delay`) on page load create more delight than hover effects.
- Keep total animation budget light — the Devvit webview is sandboxed and should feel snappy.

---

## Checklist before finishing
- [ ] Design direction is intentional, not default
- [ ] No `<style>` blocks — Tailwind classes only
- [ ] No arbitrary values (`p-[13px]`) — use scale steps
- [ ] Dark mode variants on all color classes
- [ ] Buttons have `disabled`, `active:scale-95`, and `focus-visible:ring` classes
- [ ] Minimum tap target size respected
- [ ] Typography follows the hierarchy (xl → base → sm → xs)
- [ ] At least one memorable visual detail per screen
