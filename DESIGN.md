---
name: Linkify
description: Enterprise URL shortener and link management platform
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  border: "oklch(0.922 0 0)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.145 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
typography:
  body:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  display:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  label:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2rem"
  xl: "4rem"
---

# Design System: Linkify

## 1. Overview

**Creative North Star: "The Link Vault"**

Every link deserves to be stored, tracked, and protected with the same care a vault gives its contents. The design communicates this through restraint: high-contrast ink on clean surfaces, deliberate whitespace, and hierarchy that guides the eye without decoration. Nothing is there by accident; nothing calls attention to itself unless it deserves it.

The system explicitly rejects the SaaS-cream default — tinted warm off-white backgrounds, glassmorphism decoration, gradient text, numbered section eyebrows, and the hero-metric template. Instead, it trusts typography, spacing, and contrast to do the work. The palette starts from a restrained monochrome base (the vault's clean interior) with room to add a single bold accent that signals the moments that matter — the action, the highlight, the click.

The brand voice is clean, minimal, reliable. Inspired by the precision of tools like Supabase and Clerk: confident when it needs attention, quiet when it doesn't.

**Key Characteristics:**
- Monochrome-dominant with a single accent used sparingly (≤10% of any screen)
- High contrast: near-black ink on white surface, never gray-on-gray body text
- Typography-driven hierarchy: weight and size carry the signal, not color
- Surfaces are flat at rest; motion serves interaction, not decoration
- Whitespace is structural, not ornamental

## 2. Colors

A restrained monochrome palette built on neutral grays, with one concentrated accent color reserved for primary actions and key highlights.

### Primary
- **Ink** (oklch(0.205 0 0)): The primary interactive color and all headings. Visually identical to foreground — there is no secondary brand color vying for attention. Cards and buttons that need emphasis use this as their background.

### Neutral
- **Paper** (oklch(1 0 0)): The default surface. White by default, with no warm tint.
- **Ink** (oklch(0.145 0 0)): Body text. Nearly black for maximum readability.
- **Mist** (oklch(0.97 0 0)): Muted surfaces, secondary backgrounds, hover states. A whisper of gray, nothing more.
- **Ash** (oklch(0.556 0 0)): Secondary text, placeholders, metadata. High enough contrast to be readable, quiet enough to recede.
- **Line** (oklch(0.922 0 0)): Borders and dividers. Present but unobtrusive.

### Feedback
- **Signal Red** (oklch(0.577 0.245 27.325)): Destructive actions and errors. The only saturated color in the default palette.

### Future accent direction
The base supports adding one concentrated accent (a deep teal, a warm amber, or a trustworthy indigo) once the brand identity solidifies. The accent should never exceed 10% surface coverage on any page — its rarity is its power.

## 3. Typography

**Display & Body Font:** Geist Variable (with system sans-serif fallback)

**Character:** Geist is a geometric sans-serif with a warm, humanist feel that keeps the interface approachable without sacrificing precision. A single family across all roles simplifies the hierarchy and reinforces the system's minimal philosophy.

### Hierarchy
- **Display** (700, clamp(2.25rem, 6vw, 4.5rem), 1.1, -0.03em): Hero headlines only. Never used more than once per page. Set with `text-wrap: balance`.
- **Headline** (700, clamp(1.5rem, 4vw, 2.25rem), 1.2, -0.02em): Section headings and featured content.
- **Title** (600, 1.125rem, 1.3): Card titles, feature names, subheadings within sections.
- **Body** (400, 1rem, 1.6): All running text. Capped at 65–75ch line length.
- **Label** (500, 0.875rem): Buttons, input labels, nav links, badges, metadata.

### Named Rules
**The Single-Family Rule.** Geist serves every role from hero to footnote. No font pairing, no second face. Hierarchy is communicated through weight, size, and spacing — not a font switch.

## 4. Elevation

Surfaces are flat by default. Depth is conveyed through tonal layering (Mist on Paper) rather than shadows. Shadows appear only as a response to state — hover, focus, active — and never exceed a subtle lift.

- **Hover lift** (`0 4px 12px rgba(0,0,0,0.08)`): Applied to interactive cards and buttons on hover. Translates to `translateY(-4px)` combined with shadow.
- **Modal backdrop** (`0 0 0 9999px rgba(0,0,0,0.1)`): Backdrop behind dialogs and sheets.
- **Navbar glass** (`backdrop-blur-xl`): The fixed navigation gains a blur underlay on scroll, separating it from the page content without a solid background.

### Named Rules
**The Flat-by-Default Rule.** Every surface starts at elevation 0. Shadows are earned through interaction, not assigned by role.

## 5. Components

### Buttons
- **Shape:** Rounded at the edges — lg radius (10px) for standard buttons, smaller for compact variants.
- **Primary:** Ink background, Paper text. Hover reduces opacity to 80%. Active presses down 1px.
- **Outline:** Paper background, Ink text, Line border. Hover adds Mist background.
- **Ghost:** No background or border. Hover adds Mist. Reserved for inline actions within content.
- **Size spectrum:** xs (24px), sm (28px), default (32px), lg (36px), icon (32px). Padding scales proportionally.

### Cards / Containers
- **Corner:** xl radius (14px) on the landing page feature cards, reducing to lg (10px) for inline panels.
- **Background:** Paper (white) by default. Feature cards in the landing grid use `bg-card/50 backdrop-blur-sm` — a whisper of translucency that separates them from the page without fighting the hierarchy.
- **Shadow Strategy:** `shadow-sm` at rest, transitions to `shadow-md` on hover. No inner shadow, no border accent.
- **Border:** 1px Line border present on all cards. Keeps cards distinct even without shadow.
- **Internal Padding:** 1.5rem (24px) on all sides.

### Inputs / Fields
- **Style:** Line border, Paper background, lg radius (10px). Clear, functional, no decoration.
- **Focus:** Ring appears (3px, Ring color) replacing the border.
- **Placeholder:** Ash color (muted-foreground), not a lighter gray. Must meet 4.5:1 contrast.
- **Error:** Border shifts to Signal Red, ring inherits the same.

### Navigation
- **Primary nav links:** Label style (500, 0.875rem), Ash color at rest, Ink on hover. No underline, no background.
- **CTA buttons** within nav: Primary or Outline button variant per context.
- **Mobile:** Sheet from the right, same link treatment stacked vertically. Backdrop blur on the overlay.

## 6. Do's and Don'ts

### Do:
- **Do** use high-contrast body text (4.5:1 minimum). Near-black on white. Gray body text is the single fastest way to make the interface feel thin.
- **Do** let typography carry hierarchy. Vary weight and size before reaching for color.
- **Do** use whitespace as a structural device. Sections breathe; adjacent elements do not fight for attention.
- **Do** use the accent color (when it arrives) on ≤10% of any given screen. Its rarity signals importance.
- **Do** animate with purpose — scroll-triggered reveals, hover feedback, focus rings. No decorative loops.
- **Do** respect `prefers-reduced-motion`. All animations degrade to instant transitions.

### Don't:
- **Don't** use warm-tinted off-white backgrounds. The AI-default cream/sand/beige aesthetic is explicitly rejected.
- **Don't** use glassmorphism decoratively. Blur backgrounds are reserved for the navbar-on-scroll and modal overlays — never cards or sections.
- **Don't** use gradient text (`background-clip: text` with a gradient). Single solid colors only.
- **Don't** put tiny uppercase tracked eyebrows above every section. One named kicker as a deliberate voice choice is fine; an eyebrow on every section is the 2023-era AI scaffold.
- **Don't** use numbered section markers (01 / 02 / 03) as default scaffolding. Numbers earn their place only when the section is an actual step-by-step sequence.
- **Don't** use border-left greater than 1px as a colored accent stripe. Use full borders, background tints, or nothing.
- **Don't** let headlines overflow their container on tablet or mobile. Test every heading at every breakpoint.
