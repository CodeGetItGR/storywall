# FE guide: Story preset filters

Not a backend feature — this doc exists to record the scope decision so it doesn't get
re-litigated, and to hand the frontend team a concrete spec. **No API, DTO, or endpoint
changes accompany this.** See `stories-fe-integration-guide.md` for the actual story
create/upload contract, which is unchanged.

## What this is

Instagram-Stories-style preset filters — swipe left/right on the story preview (post-capture,
pre-post) to cycle through a fixed set of named looks (their "Paris", "New York", etc.
equivalent). Not AR/face filters — no face tracking, no live camera effects. Each preset is a
static color/tone transform applied to the still image.

**v1 is images only.** Video stories skip the filter step entirely (no preset UI shown) —
per-frame canvas filtering plus re-encoding cost/perf hasn't been scoped, and the swipe UI
should not appear to promise a capability that isn't there. Video filter support is a separate,
later discussion, not assumed here.

## Where it lives: 100% client-side

1. User captures or picks a photo for their story.
2. In the preview screen, the chosen preset is rendered live as a CSS `filter` on the image
   element.
3. On post, the filter is **baked into the asset** — canvas is flattened to a single image —
   before it's uploaded through the existing media upload flow. The backend receives a normal
   image and has no idea a filter was ever involved.
4. The unfiltered original is **not** kept anywhere once posted. If "edit filter after
   posting" or "download original" ever becomes a requirement, that's a new scope — it needs
   a place to store the pre-filter asset and a new endpoint, and should come back as its own
   discussion rather than assumed here.

No new fields on `StoryRequestDto`/`StoryResponseDto`, no new `Media` metadata, no backend
work at all for v1.

## Scoped globally, not per event type

Considered scoping filter sets by `EventTypeKey` (WEDDING, FESTIVAL, CORPORATE, ...) so each
event "feels" different. Decided against it for v1: filters are a personal taste choice, not
content-appropriateness — a vivid filter on a wedding photo isn't wrong. Building per-type
sets multiplies the design/QA surface (need enough good presets per type) for mostly cosmetic
payoff.

If this comes back later: it's still a **pure frontend change**, no backend involvement. The
story creator already has the parent `Event` (and its `eventType`) in hand when the user is
picking a filter, so it's just a client-side lookup table (`eventType -> preset id[]`) gating
which presets are offered. Keep that in mind as a cheap extension point, not a v1 requirement.

## Preset set (v1 proposal)

Each preset is a name + a CSS/canvas filter string + an optional overlay (grain/vignette).
Numbers are starting points — tune visually, these aren't precise.

| Preset | `filter` (CSS syntax) | Overlay |
|---|---|---|
| Original | *(none — always first, no swipe needed to reach it)* | — |
| Warm | `brightness(1.05) saturate(1.15) sepia(0.08) contrast(1.05)` | — |
| Golden Hour | `sepia(0.25) saturate(1.2) brightness(1.05)` | — |
| Cool | `saturate(1.1) brightness(0.98) contrast(1.05) hue-rotate(180deg) saturate(1.05)` | — |
| Vivid | `saturate(1.4) contrast(1.15)` | — |
| Fade | `contrast(0.85) brightness(1.1) saturate(0.9)` | faint white wash, ~8% opacity |
| Mono | `grayscale(1) contrast(1.1)` | — |
| Noir | `grayscale(1) contrast(1.3) brightness(0.9)` | vignette, ~15% |
| Vintage | `sepia(0.15) contrast(0.95) saturate(0.85)` | grain texture + vignette |

`hue-rotate` on a single filter shifts *all* hues uniformly, which can tint skin tones green —
"Cool" needs a real preview check, not just trusting the formula. Grain/vignette overlays are
a semi-transparent PNG/canvas layer composited on top, not part of the CSS filter string.

## Suggested shape (frontend-internal, not an API contract)

```ts
interface StoryFilterPreset {
  id: string;            // "warm", "noir", ...
  label: string;         // display name
  cssFilter: string;     // "" for Original
  overlay?: { type: "grain" | "vignette" | "wash"; opacity: number };
}
```

Apply `cssFilter` directly as the `filter` CSS property for live preview; for the bake-in
step, draw the image to a canvas with the same filter set as the 2D context's `ctx.filter`,
composite the overlay on top, then export.
