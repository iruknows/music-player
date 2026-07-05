<script setup lang="ts">
import type { Track } from '../composables/useAudioPlayer'

defineProps<{
  tracks: Track[]
  currentId?: string
  isPlaying: boolean
  currentIndex: number
}>()

const emit = defineEmits<{
  (e: 'files-selected', files: FileList): void
  (e: 'play', index: number): void
  (e: 'remove', id: string): void
  (e: 'clear'): void
}>()

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—:—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function onFileInput(ev: Event) {
  const input = ev.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    emit('files-selected', input.files)
  }
  input.value = ''
}
</script>

<template>
  <section class="playlist" aria-label="Playlist">
    <header class="playlist-head">
      <div class="head-title">
        <span>Playlist</span>
        <span class="count">{{ tracks.length }} {{ tracks.length === 1 ? 'track' : 'tracks' }}</span>
      </div>
      <div class="head-actions">
        <label class="add-btn" tabindex="0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Add files</span>
          <input
            type="file"
            accept="audio/*"
            multiple
            @change="onFileInput"
            class="file-input"
          />
        </label>
        <button
          v-if="tracks.length"
          type="button"
          class="clear-btn"
          title="Clear playlist"
          @click="$emit('clear')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          </svg>
        </button>
      </div>
    </header>

    <ul v-if="tracks.length" class="track-list" role="listbox">
      <li
        v-for="(track, index) in tracks"
        :key="track.id"
        class="track-row"
        :class="{ active: track.id === currentId }"
        @click="$emit('play', index)"
        @keydown.enter.prevent="$emit('play', index)"
        @keydown.space.prevent="$emit('play', index)"
        tabindex="0"
        role="option"
        :aria-selected="track.id === currentId"
      >
        <span class="track-index">
          <span class="num">{{ index + 1 }}</span>
          <span v-if="track.id === currentId && isPlaying" class="bars" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
          <svg v-else class="play-mini" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 5v14l12-7z" />
          </svg>
        </span>
        <span class="track-meta">
          <span class="track-title">{{ track.title }}</span>
          <span class="track-artist">{{ track.artist }}</span>
        </span>
        <span class="track-dur">{{ formatDuration(track.duration) }}</span>
        <button
          type="button"
          class="remove-btn"
          title="Remove"
          aria-label="Remove track"
          @click.stop="$emit('remove', track.id)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </li>
    </ul>

    <div v-else class="empty">
      <div class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </div>
      <p class="empty-title">No tracks yet</p>
      <p class="empty-sub">Drop audio files here, or click <strong>Add files</strong> up top.</p>
    </div>
  </section>
</template>

<style scoped>
.playlist {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.playlist-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.head-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.2px;
}

.count {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.55);
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}

.add-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.22);
}

.add-btn:active {
  transform: scale(0.97);
}

.add-btn svg {
  width: 14px;
  height: 14px;
}

.file-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.clear-btn {
  appearance: none;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.clear-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.25);
}

.clear-btn svg {
  width: 16px;
  height: 16px;
}

.track-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.track-list::-webkit-scrollbar {
  width: 8px;
}
.track-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
}
.track-list::-webkit-scrollbar-track {
  background: transparent;
}

.track-row {
  display: grid;
  grid-template-columns: 32px 1fr auto 28px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.18s ease;
  color: rgba(255, 255, 255, 0.75);
}

.track-row:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.track-row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.track-row.active {
  background: linear-gradient(90deg, var(--accent-bg), transparent 80%);
  color: #fff;
}

.track-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.track-row.active .track-index {
  background: var(--accent);
  color: #fff;
}

.play-mini {
  width: 12px;
  height: 12px;
  display: block;
}

.track-row:hover .num {
  display: none;
}
.track-row:hover .play-mini {
  display: block;
}

.track-row:not(:hover) .play-mini {
  display: none;
}
.track-row:not(:hover) .num {
  display: inline;
}

.bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.bars span {
  display: block;
  width: 3px;
  background: #fff;
  border-radius: 2px;
  animation: eq 1s ease-in-out infinite;
}

.bars span:nth-child(2) {
  animation-delay: 0.2s;
}
.bars span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes eq {
  0%, 100% {
    height: 30%;
  }
  50% {
    height: 100%;
  }
}

.track-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.track-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-dur {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
}

.remove-btn {
  appearance: none;
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.18s ease, color 0.2s ease, background 0.2s ease;
}

.track-row:hover .remove-btn,
.track-row:focus-within .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  color: #fff;
  background: rgba(255, 80, 80, 0.25);
}

.remove-btn svg {
  width: 14px;
  height: 14px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 16px;
  text-align: center;
  border: 1.5px dashed rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.55);
}

.empty-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.7);
}

.empty-icon svg {
  width: 22px;
  height: 22px;
}

.empty-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.empty-sub {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
}

@media (max-width: 600px) {
  .track-list {
    max-height: 260px;
  }
  .track-row {
    grid-template-columns: 28px 1fr auto 24px;
    padding: 8px 10px;
  }
  .remove-btn {
    opacity: 1;
  }
}
</style>
