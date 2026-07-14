---
name: Linkify
description: Enterprise URL shortener and link management platform
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.09 0 0)"
  primary: "oklch(0.35 0.12 260)"
  primary-foreground: "oklch(0.985 0 0)"
  muted: "oklch(0.96 0.005 260)"
  muted-foreground: "oklch(0.55 0.01 260)"
  accent: "oklch(0.65 0.15 260)"
  accent-foreground: "oklch(0.985 0 0)"
  border: "oklch(0.88 0.005 260)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.09 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
typography:
  body:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  display:
    fontFamily: "'Sora Variable', sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Sora Variable', sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
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

**Creative North Star: "The Machined Tool"**

Linkify is a tool for people who care about their links. The design treats every interface like a precision instrument — machined, deliberate, no loose parts. It draws inspiration from Arc's bold colour confidence and Superhuman's premium density management.

The system is built on a full-palette colour strategy: a deep indigo blue anchors the interactive layer, cool-tinted neutrals provide structure, and pure black-on-white delivers uncompromising readability. Typography pairs a sharp geometric display face (Sora) for moments of emphasis with a warm humanist body (Geist) for clarity at scale.

Nothing is accidental. Every border weight, every spacing unit, every colour carries a job. The brand is not minimalist by default — it is **bold by default**, **opinionated in every choice**, and **polished to the pixel**.

**Key Characteristics:**
- Full-palette colour: deep indigo primary, cool-tinted neutrals, pure surfaces
- Two-family typography: Sora (bold geometric display) + Geist (warm humanist body)
- Interactive elements use the indigo as a confident signal, never as decoration
- Surfaces are crisp at rest; motion is purposeful and directional
- Whitespace is structural, used to separate ideas not fill space

## 2. Colors

A full-palette system anchored by a deep indigo primary, with cool-tinted neutrals that stay clean and precise.

### Primary
- **Indigo** (oklch(0.35 0.12 260)): All primary interactive elements — buttons, links, active states. The single source of colour authority. Used at full saturation on actions, diluted to backgrounds only as a tint (`--primary / 10%`).

### Neutral
- **Paper** (oklch(1 0 0)): The default surface. Pure white.
- **Ink** (oklch(0.09 0 0)): Body text and headings. Deeper than typical greys — true near-black for maximum authority.
- **Mist** (oklch(0.96 0.005 260)): Muted surfaces, secondary backgrounds. A cool whisper, not a warm beige.
- **Ash** (oklch(0.55 0.01 260)): Secondary text, metadata, placeholders. Cool-tinted for precision.
- **Line** (oklch(0.88 0.005 260)): Borders and dividers. Cool trace, not warm shadow.

### Accent
- **Indigo Glow** (oklch(0.65 0.15 260)): Hover states, active highlights, glow effects. The brighter sibling of primary.

### Feedback
- **Signal Red** (oklch(0.577 0.245 27.325)): Destructive actions and errors.

### Dark mode
- **Surface Dark** (oklch(0.12 0.005 260)): Background in dark mode. Not pure black — a deep cool grey that sits softly.
- All colours invert with the indigo brightening to maintain contrast on dark surfaces.

### Named Rules
**The Indigo-as-Authority Rule.** Indigo appears only on interactive elements and their immediate backgrounds. It never decorates — it acts. If an element has indigo, the user can interact with it.

## 3. Typography

### Font Pair
- **Display: Sora Variable** (sharp geometric sans-serif)
- **Body: Geist Variable** (warm humanist sans-serif)

**Character of Sora:** A sharp, geometric sans-serif with precisely cut apertures and a commanding presence at display sizes. Its squared curves and structural clarity deliver the "machined tool" character. Bold weights carry the full weight of the brand's identity. Used exclusively for hero headlines and section headings.

**Character of Geist:** A warm, humanist geometric that provides readability at body sizes. Its approachable letterforms balance Sora's sharpness, creating a natural hierarchy without resorting to a second family for contrast. Used for all running text, labels, UI elements.

### Hierarchy
| Level | Family | Weight | Size | Line Ht | Letter Spacing | Where |
|---|---|---|---|---|---|---|
| **Display** | Sora | 700 | clamp(2.5rem, 7vw, 5rem) | 1.05 | -0.04em | Hero only. Once per page. |
| **Headline** | Sora | 600 | clamp(1.5rem, 4vw, 2.5rem) | 1.15 | -0.03em | Section headings. |
| **Title** | Geist | 600 | 1.125rem | 1.3 | normal | Card titles, subheadings. |
| **Body** | Geist | 400 | 1rem | 1.6 | normal | Running text. 65–75ch max. |
| **Label** | Geist | 500 | 0.875rem | 1 | normal | Buttons, nav, badges. |

### Named Rules
**The Two-Family Separation Rule.** Sora commands. Geist explains. Never use Sora for body copy or Geist for hero display. The separation of voice is deliberate and inviolable.

**The Tight-Minus-Four Display Rule.** Hero letter-spacing at -0.04em. Never tighter — letters must not touch. Never looser — the density carries the boldness.

## 4. Elevation

Surfaces are flat by default. Depth is communicated through tonal layering and precise shadow drops that feel physical, not decorative.

- **Hover lift** (`0 8px 24px rgba(0,0,0,0.1)` with `translateY(-2px)`): Applied to interactive cards and buttons. Sharp shadow, minimal float.
- **Modal backdrop** (`0 0 0 9999px rgba(0,0,0,0.12)`): Backdrop behind dialogs.
- **Navbar glass** (`backdrop-blur-xl border-b`): The fixed navigation gains a subtle separator on scroll.

### Named Rules
**The Flat-by-Default Rule.** Every surface starts at elevation 0. Shadows are earned through interaction, not assigned by role. A card at rest has no shadow — only a Line border.

## 5. Components

### Buttons
- **Shape:** Rounded at the edges — lg radius (10px) for standard buttons.
- **Primary:** Indigo background, Paper text. Hover shifts to Indigo Glow. Active presses down 1px.
- **Outline:** Paper background, Ink text, Line border. Hover adds Mist background.
- **Ghost:** No background or border. Hover adds Mist. Reserved for inline actions.
- **Size spectrum:** default (h-8), sm (h-7), lg (h-9). Padding scales proportionally.

### Cards / Containers
- **Corner:** xl radius (14px) on feature cards, lg (10px) for inline panels.
- **Background:** Paper. No translucency — surfaces are solid.
- **Border:** 1px Line border at rest. No shadow at rest.
- **Hover:** Shadow + translateY(-2px) transition.
- **Internal Padding:** 1.5rem (24px) on all sides.

### Inputs / Fields
- **Style:** Line border, Paper background, lg radius (10px).
- **Focus:** 2px Indigo ring replaces the border. No border-radius reduction.
- **Placeholder:** Ash colour at 4.5:1 contrast minimum.
- **Error:** Border shifts to Signal Red, ring inherits.

### Navigation
- **Primary nav links:** Label style (500, 0.875rem), Ash at rest, Ink on hover. No underline.
- **CTA buttons** within nav: Primary button (Indigo) for signup, Outline for sign in.
- **Mobile:** Sheet from right. Same link treatment, stacked.

### Trust Bar
- **Style:** Logos in a muted Ash at low opacity (0.4–0.6). Grid or flex-wrap layout. No glowing effects — trust is quiet.

## 6. Layout

- **Hero:** Full viewport height with centered content. A bold headline sits above a single input-drive CTA. Background: the gradient orb technique with Indigo/Mist rather than warm tones, signalling the brand colour from the first fold.
- **Grids:** `repeat(auto-fit, minmax(280px, 1fr))` for breakpoint-free feature grids.
- **Sections:** Alternating backgrounds — Paper and Mist. Each section has one message, one action.
- **Spacing rhythm:** 80px vertical between sections (py-20), 64px on mobile (py-16).
- **Content max-width:** 1280px (max-w-7xl), prose blocks capped at 72ch.

## 7. Motion

- **Directional reveals:** Content exits toward one edge and enters from the opposite. Creates a sense of forward momentum.
- **Timing:** 400ms entrance, 200ms exit, 150ms micro-interactions.
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` — sharp acceleration, settled deceleration.
- **Stagger:** Items within the same section offset by 80ms per item.
- **Scroll-triggered:** `IntersectionObserver` with 0.1 threshold. Fire once; never loop.
- **Reduced motion:** All animations degrade to instant opacity transitions at `prefers-reduced-motion: reduce`.
- **No layout animation:** Never animate dimensions or positions that cause repaint. Stick to transform/opacity.

### Named Rules
**The Directional Reveal Rule.** Content enters from below (or the same directional flow as reading). It never fades in from nowhere — the motion has a physical direction.

## 8. Do's and Don'ts

### Do:
- **Do** use the Indigo accent with conviction. A full-indigo button is not excessive — it's purposeful.
- **Do** let typography carry hierarchy. Sora for impact, Geist for information.
- **Do** use cool-tinted neutrals. Mist is a cool grey, not a warm beige.
- **Do** keep surfaces solid. No glassmorphism, no decorative blur.
- **Do** animate with directional purpose. Content moves as if it has physical momentum.

### Don't:
- **Don't** use warm-tinted off-white backgrounds. The AI default beige is rejected.
- **Don't** use glassmorphism decoratively. Not on cards, not on sections.
- **Don't** use gradient text. Solid colours only.
- **Don't** put tiny uppercase tracked eyebrows above every section. One as voice is fine; all sections is scaffolding.
- **Don't** use numbered section markers (01 / 02 / 03) as default scaffolding.
- **Don't** use rounded icons above every card heading. Break up the pattern.
- **Don't** let headlines overflow on tablet/mobile. Test every heading at every breakpoint.
- **Don't** use Indigo as a decorative element. If it doesn't signal interaction, it shouldn't be indigo.
