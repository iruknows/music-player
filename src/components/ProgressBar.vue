<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  current: number
  duration: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'seek', percent: number): void
  (e: 'scrubbing', value: boolean): void
}>()

const trackEl = ref<HTMLDivElement | null>(null)
const dragging = ref(false)
const hover = ref(false)
const hoverFraction = ref(0)

const percent = computed(() =>
  props.duration > 0 ? Math.min(100, Math.max(0, (props.current / props.duration) * 100)) : 0
)

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fractionFromEvent(ev: PointerEvent): number {
  const el = trackEl.value
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left))
  return (x / rect.width) * 100
}

function onPointerDown(ev: PointerEvent) {
  if (props.disabled || props.duration <= 0) return
  dragging.value = true
  emit('scrubbing', true)
  const f = fractionFromEvent(ev)
  emit('seek', f)
  ;(ev.target as Element).setPointerCapture?.(ev.pointerId)
}

function onPointerMove(ev: PointerEvent) {
  if (props.disabled || props.duration <= 0) return
  hoverFraction.value = fractionFromEvent(ev)
  if (dragging.value) emit('seek', hoverFraction.value)
}

function onPointerUp(ev: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  emit('scrubbing', false)
  ;(ev.target as Element).releasePointerCapture?.(ev.pointerId)
}

function onMouseEnter() {
  hover.value = true
}
function onMouseLeave() {
  hover.value = false
}

const thumbVisible = computed(() => props.duration > 0 && !props.disabled)
</script>

<template>
  <div class="seek-row">
    <span class="time">{{ formatTime(current) }}</span>
    <div
      ref="trackEl"
      class="track"
      :class="{ disabled, hover, dragging }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      role="slider"
      :aria-valuemin="0"
      :aria-valuemax="duration || 0"
      :aria-valuenow="current || 0"
      :aria-disabled="disabled || duration <= 0"
      tabindex="0"
    >
      <div class="fill" :style="{ width: percent + '%' }"></div>
      <div
        v-show="hover && !disabled"
        class="hover-fill"
        :style="{ width: Math.max(percent, hoverFraction) + '%' }"
      ></div>
      <div
        v-show="thumbVisible"
        class="thumb"
        :style="{ left: percent + '%' }"
      ></div>
    </div>
    <span class="time">{{ formatTime(duration) }}</span>
  </div>
</template>

<style scoped>
.seek-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  color: var(--text, #cfcfd6);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  user-select: none;
}

.time {
  min-width: 42px;
  text-align: center;
  opacity: 0.7;
}

.track {
  position: relative;
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  cursor: pointer;
  transition: height 0.15s ease, background 0.2s ease;
}

.track.hover,
.track.dragging {
  height: 8px;
}

.track.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.track:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 6px;
}

.fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--accent-2, #ff6ec7));
  box-shadow: 0 0 12px rgba(170, 59, 255, 0.4);
  pointer-events: none;
  transition: width 0.05s linear;
}

.hover-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  pointer-events: none;
}

.thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%) scale(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  transition: transform 0.15s ease;
}

.track.hover .thumb,
.track.dragging .thumb {
  transform: translate(-50%, -50%) scale(1);
}
</style>
