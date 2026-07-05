<script setup lang="ts">
import type { RepeatMode } from '../composables/useAudioPlayer'

defineProps<{
  isPlaying: boolean
  shuffled: boolean
  repeat: RepeatMode
  disabled?: boolean
}>()

defineEmits<{
  (e: 'toggle-play'): void
  (e: 'next'): void
  (e: 'previous'): void
  (e: 'toggle-shuffle'): void
  (e: 'cycle-repeat'): void
}>()
</script>

<template>
  <div class="controls" :class="{ disabled }">
    <button
      type="button"
      class="ctrl ctrl-icon"
      :class="{ active: shuffled }"
      :disabled="disabled"
      :aria-pressed="shuffled"
      aria-label="Toggle shuffle"
      title="Shuffle"
      @click="$emit('toggle-shuffle')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M16 3h5v5" />
        <path d="M4 20L21 3" />
        <path d="M21 16v5h-5" />
        <path d="M15 15l6 6" />
        <path d="M4 4l5 5" />
      </svg>
    </button>

    <button
      type="button"
      class="ctrl ctrl-icon"
      :disabled="disabled"
      aria-label="Previous track"
      title="Previous"
      @click="$emit('previous')"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M6 5h2v14H6zM20 5v14L9 12z" />
      </svg>
    </button>

    <button
      type="button"
      class="ctrl ctrl-play"
      :disabled="disabled"
      :aria-label="isPlaying ? 'Pause' : 'Play'"
      :title="isPlaying ? 'Pause' : 'Play'"
      @click="$emit('toggle-play')"
    >
      <span class="play-glyph" :class="{ playing: isPlaying }">
        <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 5v14l12-7z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      </span>
    </button>

    <button
      type="button"
      class="ctrl ctrl-icon"
      :disabled="disabled"
      aria-label="Next track"
      title="Next"
      @click="$emit('next')"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
      </svg>
    </button>

    <button
      type="button"
      class="ctrl ctrl-icon"
      :class="[`repeat-${repeat}`, { active: repeat !== 'none' }]"
      :aria-pressed="repeat !== 'none'"
      :disabled="disabled"
      :title="`Repeat: ${repeat}`"
      aria-label="Cycle repeat mode"
      @click="$emit('cycle-repeat')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
      </svg>
      <span v-if="repeat === 'one'" class="repeat-badge" aria-hidden="true">1</span>
    </button>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 8px auto 0;
}

.controls.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.ctrl {
  appearance: none;
  background: transparent;
  border: 0;
  color: var(--text, #cfcfd6);
  cursor: pointer;
  padding: 0;
  font: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, color 0.2s ease, background 0.2s ease;
}

.ctrl:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: 999px;
}

.ctrl:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.ctrl-icon {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  color: var(--text, #cfcfd6);
}

.ctrl-icon:hover:not(:disabled) {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.ctrl-icon:active:not(:disabled) {
  transform: scale(0.92);
}

.ctrl-icon svg {
  width: 22px;
  height: 22px;
}

.ctrl-icon.active {
  color: var(--accent);
  background: var(--accent-bg);
}

.ctrl-play {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  box-shadow:
    0 8px 22px -6px var(--accent),
    0 4px 10px -2px rgba(0, 0, 0, 0.45),
    inset 0 -3px 0 rgba(0, 0, 0, 0.18);
  position: relative;
  transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.ctrl-play:hover:not(:disabled) {
  filter: brightness(1.08) saturate(1.05);
  box-shadow:
    0 12px 28px -6px var(--accent),
    0 6px 14px -2px rgba(0, 0, 0, 0.5),
    inset 0 -3px 0 rgba(0, 0, 0, 0.18);
}

.ctrl-play:active:not(:disabled) {
  transform: scale(0.94);
}

.play-glyph {
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-glyph svg {
  width: 26px;
  height: 26px;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
}

.repeat-badge {
  position: absolute;
  font-size: 10px;
  font-weight: 700;
  background: var(--accent);
  color: #fff;
  border-radius: 999px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  top: 6px;
  right: 6px;
  line-height: 1;
}
</style>
