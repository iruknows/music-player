<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    spinning?: boolean
    title?: string
    artist?: string
    size?: number
    /** Fraction of the track that has played, 0..1. null = no track. */
    playhead?: number | null
    /** True while the user is scrubbing the progress bar; transition is
     *  disabled so the tonearm tracks the cursor exactly. */
    scrubbing?: boolean
  }>(),
  {
    spinning: false,
    title: '',
    artist: '',
    size: 340,
    playhead: null,
    scrubbing: false,
  }
)

function hashHue(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = input.charCodeAt(i) + ((h << 5) - h)
  }
  return Math.abs(h) % 360
}

const hue = computed(() => hashHue((props.title || '') + (props.artist || '')))
const accentHue = computed(() => (hue.value + 36) % 360)

const styleVars = computed(() => ({
  '--vinyl-size': `${props.size}px`,
  '--hue': String(hue.value),
  '--accent-hue': String(accentHue.value),
}))

// Mount-time "settle" animation: the plinth arrives a touch above its
// resting position with opacity=0, then drops into place and fades to
// full opacity once Vue reports the component mounted. We use a CSS
// transition rather than a one-shot keyframe animation so the
// reduced-motion override can simply disable transition.
const plinthRef = ref<HTMLElement | null>(null)

onMounted(() => {
  // Two rAFs: one to let Vue commit the initial paint (opacity-0 /
//   lifted), then one more so the browser sees a discrete "before/
//   after" before starting the transition — guarantees the transition
//   plays instead of being coalesced into the initial render.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      plinthRef.value?.classList.add('settled')
    })
  })
})

// Tonearm rotation origin must match the SVG pivot coordinates.
// viewBox is 100×220 with pivot circle at (50, 33).
// After preserveAspectRatio="xMidYMid meet" the SVG fills the assembly height
// and is centered horizontally, so:
//
//   x = 50% of the assembly's width
//   y = (33 / 220) × 100% ≈ 15%
//
// Those values are baked into `transformOrigin` via CSS.

// Tonearm angles (degrees, CSS rotate, CW positive).
//   REST:  arm tilted ~6° CCW so the headshell sits in a cradle just off
//          the right edge of the disc. Negative small enough to keep the
//          needle on the plinth at all responsive disc sizes.
//   OUTER: needle lands clearly inside the disc outer edge; playhead = 0.
//   INNER: needle lands just outside the centre label; playhead = 1.
//
// Geometry: the SVG viewBox is 100×220. The pivot circle is at (50, 33)
// and the needle at (89.5, 188), so the headshell bends the arm so that its
// vector has both an x and a y component: (39.5, 155) in viewBox units,
// scaling to ≈262px of arm length in the default 340px layout (SVG height
// scales to 82% of plinth-top, so viewBox→plinth scale is 360.8/220).
// The headshell's rightward offset is why earlier "arm straight down" math
// under-shot the angles by ~12°.
//
// Solving the circle-circle intersection (arm-circle around pivot × disc
// circle around centre) for "needle on outer edge" gives angles around
// 14°–17° depending on disc size (240/290/320/340/360). To guarantee the
// needle is on the disc at every responsive size we pick 22° — that's
// slightly inside the outer edge for all sizes. INNER = 42° places the
// needle ~5–12px outside the 0.36-radius label for every responsive size.
const TONEARM_REST_DEG = -6
const TONEARM_OUTER_DEG = 22
const TONEARM_INNER_DEG = 42

const tonearmAngle = computed(() => {
  const ph = props.playhead
  if (ph == null || !Number.isFinite(ph)) return TONEARM_REST_DEG
  const clamped = Math.max(0, Math.min(1, ph))
  return TONEARM_OUTER_DEG + (TONEARM_INNER_DEG - TONEARM_OUTER_DEG) * clamped
})

// Idle wobble: when a track is loaded and paused (not playing, not being
// scrubbed), the arm gently oscillates around the current playhead position
// to feel "alive" instead of frozen. The wobble is applied on a wrapper
// element so it composes with the .tonearm's playhead rotation without
// disturbing the existing transition or scrubbing logic.
const shouldWobble = computed(
  () => !props.spinning && props.playhead != null && !props.scrubbing
)
</script>

<template>
  <div class="turntable-stage" :style="styleVars" aria-hidden="true">
    <div class="plinth" ref="plinthRef">
      <div class="plinth-top">
        <div class="deck-brand">SPINN<span class="dot">·</span>TT</div>
        <div class="speed-indicator" :class="{ active: spinning }">
          <span class="speed-dot"></span>
          <span class="speed-dot live"></span>
          <span class="speed-label">{{ spinning ? '33⅓' : '–' }}<small>rpm</small></span>
        </div>

        <div class="tonearm-assembly">
          <div
            class="tonearm-wobble"
            :class="{ wobbling: shouldWobble }"
          >
          <div
            class="tonearm"
            :class="{ scrubbing }"
            :style="{ transform: `rotate(${tonearmAngle}deg)` }"
          >
            <!-- SVG-internal drop-shadow (rather than CSS `filter: drop-shadow`
                 on the parent). CSS filter + JS-driven transform caused
                 layer thrashing on Windows Chromium; an SVG <filter> lives
                 inside the Skia raster pipeline and re-rasterizes reliably
                 when the parent transform updates. dx=0/dy=8/stdDev=5
                 matches the original CSS filter's offset + 10px blur. -->
            <svg
              class="tonearm-svg"
              viewBox="0 0 100 220"
              preserveAspectRatio="xMidYMid meet"
              focusable="false"
              filter="url(#armShadow)"
            >
              <!-- Counterweight (sits above the pivot) -->
              <rect x="38" y="6" width="24" height="22" rx="3" fill="url(#cwGrad)" />
              <line
                x1="42"
                y1="11"
                x2="58"
                y2="11"
                stroke="rgba(255,255,255,0.28)"
                stroke-width="0.5"
              />
              <circle cx="50" cy="20" r="2" fill="#0a0a0e" />

              <!-- Pivot collar -->
              <circle cx="50" cy="33" r="9" fill="url(#collarGrad)" />
              <circle cx="50" cy="33" r="4" fill="#0a0a0e" />
              <circle cx="48" cy="31" r="1.4" fill="rgba(255,255,255,0.5)" />

              <!-- Arm tube (long vertical rod) -->
              <rect x="46.5" y="40" width="7" height="115" rx="1.4" fill="url(#armGrad)" />
              <rect x="46.5" y="40" width="7" height="2" rx="1" fill="rgba(255,255,255,0.4)" />
              <line
                x1="50"
                y1="44"
                x2="50"
                y2="155"
                stroke="rgba(0,0,0,0.28)"
                stroke-width="0.4"
              />

              <!-- S-curve bend before headshell -->
              <path
                d="M 46.5 152 Q 50 156 56 159 L 70 162 Q 78 162 84 164 L 70 168 Q 60 167 53 161 L 46.5 158 Z"
                fill="url(#armGrad)"
              />

              <!-- Headshell -->
              <path
                d="M 70 162 L 92 165 L 91 184 L 70 178 Z"
                fill="url(#hsGrad)"
              />
              <line
                x1="71"
                y1="170"
                x2="91"
                y2="170"
                stroke="rgba(255,255,255,0.25)"
                stroke-width="0.4"
              />

              <!-- Cartridge body mounted on headshell -->
              <rect x="74" y="171" width="14" height="9" rx="1" fill="#0b0b10" />
              <rect x="76" y="173" width="10" height="1.6" fill="rgba(170,59,255,0.7)" />

              <!-- Needle (the tiny tip touching the record) -->
              <circle cx="89.5" cy="188" r="2.4" fill="#ff4060" />
              <circle cx="89.5" cy="188" r="1.0" fill="#ffe0e4" />

              <defs>
                <linearGradient id="cwGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="#d4d4da" />
                  <stop offset="0.5" stop-color="#6e6e74" />
                  <stop offset="1" stop-color="#1e1e22" />
                </linearGradient>
                <linearGradient id="armGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="#dadade" />
                  <stop offset="0.5" stop-color="#9a9aa0" />
                  <stop offset="1" stop-color="#44444a" />
                </linearGradient>
                <linearGradient id="hsGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="#e8e8ec" />
                  <stop offset="0.5" stop-color="#a8a8b0" />
                  <stop offset="1" stop-color="#3a3a42" />
                </linearGradient>
                <radialGradient id="collarGrad" cx="0.3" cy="0.3">
                  <stop offset="0" stop-color="#e0e0e4" />
                  <stop offset="0.6" stop-color="#7c7c84" />
                  <stop offset="1" stop-color="#2c2c30" />
                </radialGradient>
                <filter
                  id="armShadow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feDropShadow
                    dx="0"
                    dy="8"
                    stdDeviation="4"
                    flood-color="#000000"
                    flood-opacity="0.4"
                  />
                </filter>
              </defs>
            </svg>
          </div>
          </div>

          <!-- Pivot post: a chrome cylinder at the visual pivot (50%, 15%) of
               the assembly — same point where the SVG pivot collar renders.
               Sits OUTSIDE .tonearm-wobble so the post stays put while the
               arm body wobbles around it. -->
          <div class="tonearm-post"></div>
        </div>

        <div class="platter">
          <div class="vinyl-shadow"></div>
          <div class="vinyl" :class="{ spinning }">
            <div class="disc">
              <div class="grooves grooves-a"></div>
              <div class="grooves grooves-b"></div>
              <div class="grooves grooves-c"></div>
              <div class="shine"></div>
              <div class="label">
                <div class="label-ring"></div>
                <div class="label-text">
                  <div class="label-title">{{ title || 'No track loaded' }}</div>
                  <div class="label-artist">{{ artist || '—' }}</div>
                </div>
                <div class="label-center"></div>
              </div>
              <div class="spindle"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── Stage ───
   The plinth is gravity-anchored to the bottom of the stage
   (`align-items: flex-end`) so the deck reads as resting on a surface
   rather than floating mid-air. Combined with the deep drop-shadow
   underneath the plinth, this is what lands the "sitting on a table"
   aesthetic — the shadow is plausibly cast onto something below.
   (Useful in any host that sets an explicit height on the stage's
   parent; in a content-sized parent, the stage's height reduces to
   the plinth's and the flex-end alignment collapses to start.)
*/
.turntable-stage {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* ─── Plinth: flat, sitting on the table ───
   No perspective or tilt — the deck reads as a uniformly rounded
   rectangle viewed from directly above, like a real audio component
   resting on a surface. The disc tracks as a perfect circle, the
   tonearm pivots true around its chrome post, and the deep drop-shadow
   gives the impression of the chassis casting onto the surface beneath.

   Mount-time settle: the plinth renders at translateY(-8px) + opacity:0
   (via the :not(.settled) selector below) and Vue's onMounted hook adds
   the `.settled` class after two rAFs. That's when the transition fires
   and the plinth drops the last few pixels into place while fading in,
   like a chassis being set down onto the surface. Because opacity is
   multiplicative on descendants, the disc + tonearm + brand markings
   all settle with the chassis — no separate per-element choreography.

   Hover affordance: :hover below nudges the deck another 2px toward
   the cursor (visually lifting it off the surface by a hair) and
   pulls the drop-shadow slightly outward — deeper offset, wider
   spread, marginally higher alpha. The same transition declaration
   handles both the settle and the hover, so the timing stays uniform
   and the two effects feel like the same material rather than two
   separate transitions fighting each other.
*/
.plinth {
  position: relative;
  background: linear-gradient(180deg, #20142c 0%, #0c0612 100%);
  border-radius: 14px;
  padding: clamp(14px, 1.6vw, 22px);
  /* Two stacked drop-shadows: a tight dark pool hugging the deck edge
     plus a softer ambient spread further out. Combined with the inset
     bevel highlight this gives the deck a grounded, furniture-like
     presence — no 3D context, no clip-path, just a clean rectangular
     box-shadow blob underneath. */
  box-shadow:
    0 60px 100px -30px rgba(0, 0, 0, 0.7),
    0 12px 30px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  /* Joint transition for the mount-settle, the hover lift, and the
     hover shadow grow. The pre-mount rAF chain in the script guarantees
     the `.settled` class swap is observed as a distinct style change,
     so the transition actually plays. All three properties share the
     same 500ms duration and "quint out" easing (fast in, slow out) so
     the deck feels calm rather than jumpy in both states. */
  transition:
    transform 500ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 500ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 500ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Pre-settle state: the plinth hovers 8px above its resting line and
   is fully transparent. As soon as the `.settled` class lands (after
   mount) the selector no longer matches, transform + opacity revert
   to default, and the transition above interpolates the drop + fade.

   SPECIFICITY NOTE: this selector is 0,2,0 — the same as `.plinth:hover`
   and `.plinth:focus-visible` below. Those two rules win the tiebreak
   purely because they are written *later* in the stylesheet, so as long
   as no future 0,2,0 rule is inserted between this rule and them, the
   order is safe. (Adding `:where(.plinth:not(.settled))` would also
   demote this rule without changing behavior, but the source-order
   approach is fine for now.) */
.plinth:not(.settled) {
  transform: translateY(-8px);
  opacity: 0;
}

/* Hover + focus-visible state — the deck nudges another 2px toward the
   cursor (out of the surface) and its drop-shadow spreads slightly, as
   if the chassis were just lifted enough to let the shadow widen around
   it. Both selectors share the same declaration block so pointer users
   and keyboard users get the same affordance. `:focus-visible` is the
   keyboard-only variant so an unrelated click on the chassis (e.g. by a
   mouse user) doesn't accidentally trigger a focus ring equivalent. */
.plinth:hover,
.plinth:focus-visible {
  transform: translateY(-2px);
  /* Slightly grown shadow on hover: the deep pool is offset further
     and spreads wider, the ambient spread pushes out a touch, and the
     deep-pool alpha ticks up so the widened silhouette reads more
     cleanly. The inset bevel highlight is unchanged — it lives on the
     chassis face, not on the ground-projected shadow. */
  box-shadow:
    0 75px 115px -25px rgba(0, 0, 0, 0.75),
    0 16px 36px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.plinth-top {
  position: relative;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(170, 59, 255, 0.06), transparent 60%),
    linear-gradient(135deg, #241735 0%, #11091b 100%);
  border-radius: 10px;
  /* Tightened vertical padding now that the plinth isn't compressed by
     a foreshortening scaleY — the disc needs to fill the deck rather
     than float in a sea of negative space. */
  padding: clamp(18px, 3.2vw, 32px) clamp(48px, 9vw, 86px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 -2px 0 rgba(0, 0, 0, 0.5);
}

/* ─── Decorative brand + RPM indicator printed on the deck ─── */
.deck-brand {
  position: absolute;
  top: 14px;
  left: 22px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.32);
  text-transform: uppercase;
  z-index: 3;
  pointer-events: none;
}

.deck-brand .dot {
  margin: 0 2px;
  color: var(--accent);
}

.speed-indicator {
  position: absolute;
  bottom: 16px;
  left: 22px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  z-index: 3;
  pointer-events: none;
}

.speed-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.speed-dot.live {
  background: hsl(var(--accent-hue), 80%, 60%);
  box-shadow:
    0 0 6px hsla(var(--accent-hue), 80%, 60%, 0.85),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  animation: rpm-pulse 1.6s ease-in-out infinite;
}

@keyframes rpm-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.speed-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 4px;
  text-transform: uppercase;
}

.speed-label small {
  font-size: 8.5px;
  margin-left: 1px;
  opacity: 0.7;
}

/* ─── Tonearm assembly ───
   With the deck flat on the table, the assembly's vertical extent
   is slightly reduced (from 82% to 78%) so the cartridge body has
   a touch more breathing room — and the visible band of plinth-top
   below the cartridge is a touch taller — before the speed-indicator
   at the deck's lower-left. The pivot post still sits at 15% of the
   assembly height; the needle's resting/cradle geometry itself is
   unchanged. */
.tonearm-assembly {
  position: absolute;
  top: 0;
  right: 0;
  width: 40%;
  height: 78%;
  pointer-events: none;
  z-index: 5;
}

/* The pivot post: a chrome cylinder at the visual pivot point. Positioning
   is INSIDE .tonearm-assembly so it lines up with the SVG pivot collar that
   renders at viewBox (50, 33) — same point as the arm's transform-origin. */
.tonearm-post {
  position: absolute;
  top: 15%;
  left: 50%;
  width: clamp(24px, 4.5%, 42px);
  height: clamp(24px, 4.5%, 42px);
  border-radius: 50%;
  background: radial-gradient(circle at 30% 25%, #ededf2, #6e6e74 50%, #1a1a1e);
  box-shadow:
    inset 0 2px 4px rgba(255, 255, 255, 0.35),
    inset 0 -4px 8px rgba(0, 0, 0, 0.6),
    0 6px 14px rgba(0, 0, 0, 0.55),
    0 0 0 3px rgba(0, 0, 0, 0.4);
  transform: translate(-50%, -50%);
  /* Below the arm so the arm's chrome collar shows on top of the post. */
  z-index: 5;
}

/* The wobble wrapper sits between the assembly and the .tonearm. Its
   transform-origin matches the SVG pivot (50%, 15% of the assembly box),
   so its small oscillating rotation composes additively with the .tonearm's
   playhead-driven rotation around the same point. z-index matches the arm
   so the wrapper's stacking context (created by the animated transform)
   still paints above the .tonearm-post. */
.tonearm-wobble {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform-origin: 50% 15%;
  z-index: 6;
}

.tonearm-wobble.wobbling {
  animation: tonearm-wobble 2.6s ease-in-out infinite;
}

/* Keyframes are centred on 0° offset so the arm doesn't snap when the
   animation starts or stops — it begins/ends exactly at the playhead
   position, then swings ±0.7° in a slow breath. */
@keyframes tonearm-wobble {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(-0.7deg); }
  75%      { transform: rotate(0.7deg); }
}

/* The arm element rotates. Its CSS transform-origin must align with the
   visible pivot point in the SVG (viewBox 100×220, pivot at (50, 33)). The
   rotation value itself is set as an inline `transform` style by the
   parent component (computed from `playhead`). */
.tonearm {
  position: absolute;
  inset: 0;
  /* Inline `transform` from JS drives the rotation. This is just a
     prerender fallback so SVG paint isn't broken before Vue hydrates.
     Must match TONEARM_REST_DEG in the script so reduced-motion users
     see the same cradle position. */
  transform: rotate(-6deg);
  transform-origin: 50% 15%;
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  /* Sits above the chrome post so the arm collar is visible on top of the
     post head at rest and during the swing. */
  z-index: 6;
  /* Note: `filter: drop-shadow(...)` and `will-change: transform` are
     intentionally OMITTED here. On Windows Chromium the combo caused the
     compositor to re-rasterize the shadow on every transition frame,
     which froze the rest→engaged swing and the wobble inheritance. The
     arm's depth still reads cleanly via the pivot post, gradient on the
     collar, and the counterweight. */
}

/* When the user is scrubbing, drop the transition so the arm tracks the
   pointer exactly — otherwise a 60 Hz stream of `style.transform` updates
   would be interleaved with a slow ease-out interpolation and look laggy. */
.tonearm.scrubbing {
  transition: none;
}

.tonearm-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* Faux recess around the disc — a radial-gradient that darkens around
   the disc's outer edge so the record reads as "set into" the deck
   even though the plinth is flat on the table. Without this inset
   halo the disc would look pasted onto the surface rather than seated
   in a recess pocket. */
.platter::before {
  content: '';
  position: absolute;
  inset: clamp(-18px, -2.4vw, -24px);
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    rgba(0, 0, 0, 0) 55%,
    rgba(0, 0, 0, 0.55) 75%,
    rgba(0, 0, 0, 0.85) 90%,
    rgba(0, 0, 0, 0) 100%
  );
  z-index: -1;
  pointer-events: none;
}

/* ─── Vinyl disc ───
   The spin animation lives entirely on `.vinyl.spinning` rather than
   being declared at idle and paused via `animation-play-state`. The
   earlier pattern (base = running animation + paused, .spinning =
   running + `will-change: transform`) was unreliable on Windows
   Chromium because the play-state flip and the will-change layer
   promotion fired in the same style recalc — the compositor allocated
   the layer at the exact instant play-state went `paused→running`, and
   the first frame of the rotation was silently dropped, so users on
   Windows saw a frozen disc on the first press of Play. Toggling the
   `animation` rule itself (rather than play-state) restarts the
   keyframe sequence on a fresh style recalc, and `transform:
   translateZ(0)` claims a dedicated GPU layer immediately without
   the dynamic-evaluation race that `will-change: transform` triggers
   on Windows. The disc is rotationally symmetric, so the reset-to-zero
   between pause/play reads as a clean start instead of a snap. */
.vinyl {
  position: relative;
  width: var(--vinyl-size);
  height: var(--vinyl-size);
  border-radius: 50%;
  flex-shrink: 0;
  /* `contain: paint` keeps the disc's repaints from spilling out into
     ancestors (relevant on Windows Chromium, where a rotating element
     can intermitently bleed into the plinth-top layer above it). The
     pseudo `.platter::before` halo and the `.vinyl-shadow` sibling
     aren't affected — they're either outside the disc's box or live as
     siblings, not descendants. */
  contain: paint;
}

.vinyl.spinning {
  /* Whole animation declared here — toggling the entire `animation`
     shorthand (rather than `animation-play-state`) restarts the
     keyframe sequence deterministically per class change. */
  animation: vinyl-spin 6s linear infinite;
  /* `translateZ(0)` forces an immediate, stable GPU layer — an
     alternative to `will-change: transform` that's safer on Windows
     Chromium, where `will-change` allocation racing against a class
     swap can cause that first-frame-drop regression. */
  transform: translateZ(0);
}

@keyframes vinyl-spin {
  from { transform: rotate(0deg) translateZ(0); }
  to { transform: rotate(360deg) translateZ(0); }
}

.disc {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.18), transparent 38%),
    radial-gradient(circle at 65% 75%, rgba(0, 0, 0, 0.45), transparent 45%),
    radial-gradient(circle at center, #1c1c20 0%, #0c0c0e 70%, #050506 100%);
  box-shadow:
    inset 0 0 0 2px rgba(255, 255, 255, 0.04),
    inset 0 0 30px rgba(0, 0, 0, 0.7),
    inset 0 0 80px rgba(0, 0, 0, 0.5),
    0 6px 14px -2px rgba(0, 0, 0, 0.65),
    0 1px 2px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  /* `backface-visibility: hidden` on Windows Chromium fixes the jagged
     anti-aliasing of a rotated circular shape inside a rounded overflow
     container — it forces a dedicated compositing layer and avoids
     per-frame rasterization of the disc's silhouette. */
  backface-visibility: hidden;
}

.vinyl-shadow {
  position: absolute;
  bottom: -7%;
  left: 50%;
  /* Dimensions widened from 75%×14px to 90%×22px and the gradient given
     a fanned-out falloff to compensate for removing `filter: blur(5px)`.
     The blur previously diffused the shadow over ~10px of soft falloff;
     without it, a wider radial gradient with intermediate transparent
     stops keeps the same soft silhouette AND no longer traps the
     rotating `.vinyl` sibling onto the CPU (CSS filter on a sibling is
     a Windows Chromium compositing-layer blocker). */
  width: 90%;
  height: 22px;
  background: radial-gradient(
    ellipse 50% 70% at center,
    rgba(0, 0, 0, 0.55),
    rgba(0, 0, 0, 0.25) 50%,
    transparent 75%
  );
  transform: translateX(-50%);
  opacity: 0.55;
  z-index: -1;
}

.grooves {
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  pointer-events: none;
}

.grooves-a {
  background: repeating-radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.025) 0px,
    rgba(255, 255, 255, 0.025) 1px,
    transparent 1px,
    transparent 3px
  );
}

.grooves-b {
  inset: 18%;
  /* mix-blend-mode removed (was `screen`). mix-blend-mode forces the
     rotating `.vinyl` to repaint via the CPU on every frame on Windows
     Chromium, which stalls the spin animation. Alpha bumped from 0.04 to
     0.055 so the visible contribution stays close to the original screen
     blend (screen lightens, so a touch more alpha compensates without the
     blend). */
  background: repeating-radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.055) 0px,
    rgba(255, 255, 255, 0.055) 1px,
    transparent 1px,
    transparent 4px
  );
}

.grooves-c {
  inset: 24%;
  background: repeating-radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.03) 0px,
    rgba(255, 255, 255, 0.03) 1px,
    transparent 1px,
    transparent 2px
  );
}

.shine {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  /* Both `mix-blend-mode: screen` AND `filter: blur(2px)` removed. Both
     were forcing CPU repaint of every rotation frame on Windows
     Chromium, which stalled the spinning vinyl. Each highlight stop is
     fanned into 3 intermediate transparencies so the conic gradient
     itself transitions smoothly — approximating the soft 2px blur's
     visual smoothing without paying its compositing cost. */
  background: conic-gradient(
    from 90deg,
    transparent 0deg,
    rgba(255, 255, 255, 0.05) 25deg,
    rgba(255, 255, 255, 0.14) 35deg,
    rgba(255, 255, 255, 0.05) 45deg,
    transparent 90deg,
    transparent 180deg,
    rgba(255, 255, 255, 0.025) 240deg,
    rgba(255, 255, 255, 0.07) 250deg,
    rgba(255, 255, 255, 0.025) 260deg,
    transparent 320deg
  );
  pointer-events: none;
}

.label {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 36%;
  height: 36%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.45), transparent 45%),
    linear-gradient(
      135deg,
      hsl(var(--hue), 70%, 58%) 0%,
      hsl(var(--accent-hue), 75%, 42%) 100%
    );
  box-shadow:
    inset 0 0 0 2px rgba(0, 0, 0, 0.18),
    inset 0 0 12px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.label-ring {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

.label-text {
  position: relative;
  z-index: 1;
  text-align: center;
  color: rgba(255, 255, 255, 0.95);
  font-family: var(--sans, system-ui);
  padding: 0 8%;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  line-height: 1.15;
}

.label-title {
  font-size: clamp(10px, 2.4vw, 14px);
  font-weight: 600;
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.label-artist {
  margin-top: 4px;
  font-size: clamp(8px, 1.8vw, 11px);
  font-weight: 500;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.label-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 14px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #050506;
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.1);
}

.spindle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #4a4a52, #050506 70%);
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.05),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
}

/* ─── Reduced motion: drop the spin + swing + pulse + settle animations ─── */
@media (prefers-reduced-motion: reduce) {
  .vinyl,
  .tonearm,
  .tonearm-wobble,
  .speed-dot.live {
    animation: none !important;
    transition: none !important;
  }
  /* Still keep the arm in place at rest when reduced motion is on and
     there's no track; without this the prerender fallback conflicts. */
  .tonearm:not(.scrubbing) {
    transform: rotate(-6deg);
  }
  /* Skip the mount-time settle — the plinth should appear in place
     immediately, not hover + drop + fade. This also avoids the small
     flash of opacity-0 + lifted transform that's visible to users with
     vestibular sensitivity before the transition fires. */
  .plinth {
    transition: none !important;
  }
  .plinth:not(.settled) {
    transform: none;
    opacity: 1;
  }
}


</style>
