<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  volume: number
  muted: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'set-volume', value: number): void
  (e: 'toggle-mute'): void
}>()

const trackEl = ref<HTMLDivElement | null>(null)
const dragging = ref(false)
const hover = ref(false)

const percent = computed(() => Math.round(props.volume * 100))

function fractionFromEvent(ev: PointerEvent): number {
  const el = trackEl.value
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left))
  return x / rect.width
}

function onPointerDown(ev: PointerEvent) {
  if (props.disabled) return
  dragging.value = true
  emit('set-volume', fractionFromEvent(ev))
  ;(ev.target as Element).setPointerCapture?.(ev.pointerId)
}

function onPointerMove(ev: PointerEvent) {
  if (props.disabled || !dragging.value) return
  emit('set-volume', fractionFromEvent(ev))
}

function onPointerUp(ev: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  ;(ev.target as Element).releasePointerCapture?.(ev.pointerId)
}
</script>

<template>
  <div class="volume" :class="{ disabled, hovering: hover }">
    <button
      type="button"
      class="mute-btn"
      :disabled="disabled"
      :aria-pressed="muted"
      :aria-label="muted ? 'Unmute' : 'Mute'"
      :title="muted ? 'Unmute' : 'Mute'"
      @click="$emit('toggle-mute')"
      @mouseenter="hover = true"
      @mouseleave="hover = false"
    >
      <svg v-if="muted || volume === 0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 9v6h4l5 5V4L7 9H3z" />
        <path d="M16.5 12l3.5-3.5-1.4-1.4L15 10.2l-3.6-3.6L10 8l3.6 3.6L10 15.2l1.4 1.4L15 13l3.6 3.6 1.4-1.4z" opacity="0" />
        <path d="M16 9l6 6m0-6l-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
      </svg>
      <svg v-else-if="volume < 0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 9v6h4l5 5V4L7 9H3z" />
        <path d="M16 8a5 5 0 010 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 9v6h4l5 5V4L7 9H3z" />
        <path d="M16 8a5 5 0 010 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M19 5a9 9 0 010 14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
      </svg>
    </button>
    <div
      class="vol-track"
      ref="trackEl"
      :class="{ disabled }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @mouseenter="hover = true"
      @mouseleave="hover = false"
      role="slider"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="percent"
      :aria-disabled="disabled"
      tabindex="0"
    >
      <div class="vol-fill" :style="{ width: percent + '%' }"></div>
      <div class="vol-thumb" :style="{ left: percent + '%' }"></div>
    </div>
  </div>
</template>

<style scoped>
.volume {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text, #cfcfd6);
}

.volume.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.mute-btn {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 6px;
  border-radius: 999px;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease, background 0.2s ease;
}

.mute-btn svg {
  width: 20px;
  height: 20px;
}

.mute-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.vol-track {
  position: relative;
  width: 110px;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  cursor: pointer;
  transition: height 0.15s ease;
}

.volume.hovering .vol-track {
  height: 6px;
}

.vol-track.disabled {
  cursor: not-allowed;
}

.vol-track:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

.vol-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--accent-2, #ff6ec7));
  pointer-events: none;
}

.vol-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%) scale(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  transition: transform 0.15s ease;
}

.vol-track:hover .vol-thumb,
.vol-track:focus-visible .vol-thumb {
  transform: translate(-50%, -50%) scale(1);
}

@media (max-width: 600px) {
  .vol-track {
    width: 80px;
  }
}
</style>
