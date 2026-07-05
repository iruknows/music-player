<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import VinylDisc from './VinylDisc.vue'
import PlayerControls from './PlayerControls.vue'
import ProgressBar from './ProgressBar.vue'
import VolumeControl from './VolumeControl.vue'
import TrackList from './TrackList.vue'

import { useAudioPlayer } from '../composables/useAudioPlayer'

const {
  tracks,
  currentIndex,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  shuffled,
  repeat,
  isDragOver,
  addFiles,
  removeTrack,
  clearAll,
  playTrack,
  togglePlay,
  nextTrack,
  previousTrack,
  seek,
  setVolume,
  toggleMute,
  toggleShuffle,
  cycleRepeat,
  setDragOver,
} = useAudioPlayer()

function computeVinylSize(): number {
  if (typeof window === 'undefined') return 340
  const w = window.innerWidth
  if (w < 480) return 240
  if (w < 768) return 290
  if (w < 1200) return 320
  return 360
}

const vinylSize = ref(computeVinylSize())

function onResize() {
  vinylSize.value = computeVinylSize()
}

function onDragEnter(ev: DragEvent) {
  if (!ev.dataTransfer) return
  if (Array.from(ev.dataTransfer.types || []).includes('Files')) {
    ev.preventDefault()
  }
}

function onFilesSelected(files: FileList) {
  setDragOver(false)
  addFiles(files)
}

let dragDepth = 0

function onWindowDragOver(ev: DragEvent) {
  if (!ev.dataTransfer) return
  const types = Array.from(ev.dataTransfer.types || [])
  if (!types.includes('Files')) return
  ev.preventDefault()
  dragDepth++
  setDragOver(true)
}

function onWindowDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) setDragOver(false)
}

function onWindowDrop(ev: DragEvent) {
  ev.preventDefault()
  dragDepth = 0
  setDragOver(false)
  const files = ev.dataTransfer?.files
  if (files && files.length) addFiles(files)
}

function onKeydown(ev: KeyboardEvent) {
  const target = ev.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
  switch (ev.code) {
    case 'Space':
      ev.preventDefault()
      togglePlay()
      break
    case 'ArrowRight':
      if (ev.shiftKey) {
        ev.preventDefault()
        nextTrack()
      } else if (duration.value > 0) {
        ev.preventDefault()
        seek(((currentTime.value + 5) / duration.value) * 100)
      }
      break
    case 'ArrowLeft':
      if (ev.shiftKey) {
        ev.preventDefault()
        previousTrack()
      } else if (duration.value > 0) {
        ev.preventDefault()
        seek(((currentTime.value - 5) / duration.value) * 100)
      }
      break
    case 'ArrowUp':
      ev.preventDefault()
      setVolume(volume.value + 0.05)
      break
    case 'ArrowDown':
      ev.preventDefault()
      setVolume(volume.value - 0.05)
      break
    case 'KeyM':
      ev.preventDefault()
      toggleMute()
      break
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onWindowDragOver)
  window.addEventListener('dragleave', onWindowDragLeave)
  window.addEventListener('drop', onWindowDrop)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onWindowDragOver)
  window.removeEventListener('dragleave', onWindowDragLeave)
  window.removeEventListener('drop', onWindowDrop)
  window.removeEventListener('keydown', onKeydown)
})

const eyebrow = computed(() => {
  if (!currentTrack.value) return 'Ready'
  return isPlaying.value ? 'Now playing' : 'Paused'
})

const heroTitle = computed(() => {
  return currentTrack.value?.title || 'Drop some music to begin'
})

// 0..1 fraction of the loaded track that has played, or null if no track /
// duration unknown. Drives the tonearm angle on the vinyl disc.
const playhead = computed(() => {
  if (duration.value <= 0) return null
  return Math.min(1, Math.max(0, currentTime.value / duration.value))
})

// While the user is dragging the progress bar, the tonearm transition is
// disabled so it tracks the cursor exactly (see VinylDisc.vue).
const isScrubbing = ref(false)
function onScrubbing(v: boolean) {
  isScrubbing.value = v
}
</script>

<template>
  <div class="player-shell">
    <header class="player-header">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" fill="#0b0c10" />
          </svg>
        </span>
        <span class="brand-name">Spinn</span>
      </div>
      <div class="hint">
        <kbd>Space</kbd> play / pause · <kbd>←</kbd>/<kbd>→</kbd> seek · <kbd>↑</kbd>/<kbd>↓</kbd> volume
      </div>
    </header>

    <main class="now-playing">
      <div class="now-playing-vinyl">
        <VinylDisc
          :spinning="isPlaying"
          :title="currentTrack?.title"
          :artist="currentTrack?.artist"
          :size="vinylSize"
          :playhead="playhead"
          :scrubbing="isScrubbing"
        />
      </div>
      <div class="now-playing-text">
        <div class="np-eyebrow">{{ eyebrow }}</div>
        <h1 class="np-title">{{ heroTitle }}</h1>
        <div class="np-artist">{{ currentTrack?.artist || '' }}</div>
      </div>

      <div class="progress-wrap">
        <ProgressBar
          :current="currentTime"
          :duration="duration"
          :disabled="!currentTrack"
          @seek="seek"
          @scrubbing="onScrubbing"
        />
      </div>

      <div class="bottom-controls">
        <PlayerControls
          :is-playing="isPlaying"
          :shuffled="shuffled"
          :repeat="repeat"
          :disabled="!tracks.length"
          @toggle-play="togglePlay"
          @next="nextTrack"
          @previous="previousTrack"
          @toggle-shuffle="toggleShuffle"
          @cycle-repeat="cycleRepeat"
        />
        <VolumeControl
          :volume="volume"
          :muted="isMuted"
          :disabled="!tracks.length"
          @set-volume="setVolume"
          @toggle-mute="toggleMute"
        />
      </div>
    </main>

    <TrackList
      :tracks="tracks"
      :current-id="currentTrack?.id"
      :is-playing="isPlaying"
      :current-index="currentIndex"
      @files-selected="onFilesSelected"
      @play="playTrack"
      @remove="removeTrack"
      @clear="clearAll"
    />

    <transition name="drop-fade">
      <div v-if="isDragOver" class="drop-overlay" aria-hidden="true">
        <div class="drop-card">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3v12" />
              <path d="M6 11l6 6 6-6" />
              <path d="M3 21h18" />
            </svg>
          </div>
          <div class="drop-title">Drop audio files to add them</div>
          <div class="drop-sub">Supported: mp3, wav, ogg, m4a, flac, aac</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.player-shell {
  position: relative;
  width: min(960px, 100%);
  margin: 0 auto;
  padding: clamp(20px, 4vw, 36px);
  box-sizing: border-box;
}

.player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: clamp(16px, 3vw, 28px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.brand-mark {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px -4px var(--accent);
}

.brand-mark svg {
  width: 18px;
  height: 18px;
}

.brand-name {
  font-weight: 700;
  letter-spacing: 0.6px;
  font-size: 16px;
  text-transform: uppercase;
}

.hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  display: none;
}

.hint kbd {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: var(--mono);
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 2px;
}

@media (min-width: 720px) {
  .hint {
    display: block;
  }
}

.now-playing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: clamp(20px, 4vw, 36px) clamp(16px, 3vw, 32px);
  border-radius: 22px;
  background:
    radial-gradient(circle at top, rgba(192, 132, 252, 0.12), transparent 65%),
    rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    0 30px 80px -30px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  /* Created a stacking context (no painting implications) so the ::before
     below sits between the card's own background and its in-flow children.
     The backdrop-blur is moved off the live card: backdrop-filter on the
     card itself traps ALL descendants inside the backdrop sampling layer,
     which on Windows Chromium stalled every transform/animation contained
     in the card (vinyl spin, tonearm wobble, RPM pulse). The pseudo keeps
     the visual glass effect intact while freeing the descendants to take
     their own GPU compositing layers. */
  position: relative;
  isolation: isolate;
}

.now-playing::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  pointer-events: none;
  /* Sits below the card's in-flow children via the parent's new stacking
     context. The semi-transparent own-background (rgba 0.03) lets the
     blurred content show through; we deliberately do NOT add
     `overflow: hidden` here because `.now-playing-vinyl::before` (the
     purple glow) intentionally extends past the card padding. */
  z-index: -1;
}

.now-playing-vinyl {
  position: relative;
  padding: 18px;
  border-radius: 999px;
}

.now-playing-vinyl::before {
  content: '';
  position: absolute;
  /* inset widened from -10% to -25% and gradient given intermediate stops
     to compensate for removing `filter: blur(20px)`. The blur previously
     added ~20px of soft falloff; without it, a wider, fanned gradient
     keeps the same visual diffusion AND lets the rotating `.vinyl` sibling
     claim its own GPU layer (filter on a sibling traps both onto the CPU
     on Windows Chromium). */
  inset: -25%;
  border-radius: 999px;
  background: radial-gradient(
    circle at center,
    rgba(192, 132, 252, 0.35) 0%,
    rgba(192, 132, 252, 0.18) 25%,
    rgba(192, 132, 252, 0.08) 45%,
    transparent 65%
  );
  z-index: -1;
  transition: opacity 0.35s ease;
  opacity: 0.7;
}

.now-playing-text {
  text-align: center;
  color: #fff;
}

.np-eyebrow {
  font-size: 11px;
  letter-spacing: 1.4px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 6px;
  opacity: 0.85;
}

.np-title {
  font-family: var(--heading);
  font-size: clamp(20px, 3vw, 26px);
  font-weight: 600;
  letter-spacing: -0.3px;
  margin: 0;
  color: #fff;
  line-height: 1.2;
  max-width: 540px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.np-artist {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  min-height: 18px;
}

.progress-wrap {
  width: 100%;
  max-width: 540px;
  margin-top: 6px;
}

.bottom-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  max-width: 580px;
  padding: 6px 4px 0;
}

.drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(11, 12, 16, 0.75);
  /* Backdrop-blur moved to the ::below pseudo for the same Windows
     Chromium compositing reason as .now-playing: keeping
     `backdrop-filter` on the live element forces the compositor to
     back it with a dedicated sampling layer that traps its descendants.
     `position: fixed` already establishes a stacking context; the
     explicit `isolation: isolate` is belt-and-suspenders so this overlay
     matches .now-playing's intent and stays robust against future CSS
     changes (e.g. removing position: fixed by accident). */
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drop-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  pointer-events: none;
  /* z-index -1 puts the blur between the overlay's own dark tint (which
     sits at the bottom of the new stacking context) and the in-flow
     .drop-card on top. The drop-card is positioned by virtue of the
     overlay's flex centering; it stacks naturally above the pseudo. */
  z-index: -1;
}

.drop-card {
  text-align: center;
  color: #fff;
  padding: 36px 48px;
  border: 2px dashed var(--accent);
  border-radius: 18px;
  background: rgba(170, 59, 255, 0.08);
}

.drop-icon {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-icon svg {
  width: 28px;
  height: 28px;
}

.drop-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.drop-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.drop-fade-enter-active,
.drop-fade-leave-active {
  transition: opacity 0.2s ease;
}
.drop-fade-enter-from,
.drop-fade-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .bottom-controls {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
