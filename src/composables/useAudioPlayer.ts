import { computed, onUnmounted, ref } from 'vue'

export interface Track {
  id: string
  file: File
  url: string
  title: string
  artist: string
  duration: number
}

export type RepeatMode = 'none' | 'all' | 'one'

const AUDIO_EXT_RE = /\.(mp3|wav|ogg|m4a|flac|aac|webm|opus)$/i

function parseFilename(name: string): { title: string; artist: string } {
  const cleaned = name.replace(/\.[^.]+$/, '').trim()
  for (const sep of [' - ', ' – ', ' — ']) {
    if (cleaned.includes(sep)) {
      const [artist, title] = cleaned.split(sep, 2)
      return { title: title.trim() || cleaned, artist: artist.trim() || 'Unknown Artist' }
    }
  }
  return { title: cleaned, artist: 'Unknown Artist' }
}

export function useAudioPlayer() {
  const tracks = ref<Track[]>([])
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.75)
  const isMuted = ref(false)
  const shuffled = ref(false)
  const repeat = ref<RepeatMode>('none')
  const isDragOver = ref(false)

  const audio = new Audio()
  audio.volume = volume.value
  audio.preload = 'metadata'

  const currentTrack = computed(() => {
    const i = currentIndex.value
    return i >= 0 && i < tracks.value.length ? tracks.value[i] : null
  })

  // Guard against rapid playTrack calls so we don't queue overlapping play() promises
  // on the same Audio element (which results in noisy error events).
  let pendingPlay: Promise<void> | null = null

  function tryPlay(): void {
    // Guard against synchronous spam: if a play() is in flight, skip new calls.
    if (pendingPlay) return
    const p = audio.play()
    if (p && typeof p.then === 'function') {
      pendingPlay = p
      // Clear on success too so a later tryPlay() can fire a fresh play()
      // (e.g. after a track change that came in mid-flight).
      p.then(
        () => {
          if (pendingPlay === p) pendingPlay = null
        },
        (err) => {
          if (pendingPlay === p) pendingPlay = null
          console.warn('Playback failed:', err?.message || err)
          isPlaying.value = false
        }
      )
    }
  }

  function attachListeners() {
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)
  }

  function detachListeners() {
    audio.removeEventListener('timeupdate', onTimeUpdate)
    audio.removeEventListener('loadedmetadata', onLoadedMetadata)
    audio.removeEventListener('play', onPlay)
    audio.removeEventListener('pause', onPause)
    audio.removeEventListener('error', onError)
    audio.removeEventListener('ended', onEnded)
  }

  function onTimeUpdate() {
    currentTime.value = audio.currentTime
  }
  function onLoadedMetadata() {
    if (Number.isFinite(audio.duration)) {
      duration.value = audio.duration
      const t = currentTrack.value
      if (t) t.duration = audio.duration
      updateMediaSession()
    }
  }
  function onPlay() {
    isPlaying.value = true
    updateMediaSession()
  }
  function onPause() {
    isPlaying.value = false
    updateMediaSession()
  }
  function onError() {
    console.warn('Audio playback error:', audio.error?.code, audio.error?.message)
    isPlaying.value = false
  }
  function onEnded() {
    if (repeat.value === 'one') {
      audio.currentTime = 0
      tryPlay()
      return
    }
    advance()
  }

  attachListeners()

  function updateMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const t = currentTrack.value
    try {
      navigator.mediaSession.metadata = t
        ? new MediaMetadata({
            title: t.title,
            artist: t.artist,
            album: 'Spinn',
          })
        : null
      navigator.mediaSession.playbackState = isPlaying.value ? 'playing' : 'paused'
      const action = (handler: () => void) => {
        try {
          handler()
        } catch (err) {
          console.warn('mediaSession action failed', err)
        }
      }
      navigator.mediaSession.setActionHandler('play', () => action(togglePlay))
      navigator.mediaSession.setActionHandler('pause', () => action(togglePlay))
      navigator.mediaSession.setActionHandler('previoustrack', () => action(previousTrack))
      navigator.mediaSession.setActionHandler('nexttrack', () => action(nextTrack))
      navigator.mediaSession.setActionHandler('seekforward', () => {
        if (duration.value > 0) action(() => seek(((currentTime.value + 5) / duration.value) * 100))
      })
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (duration.value > 0) action(() => seek(((currentTime.value - 5) / duration.value) * 100))
      })
    } catch (err) {
      // MediaSession not fully supported (Safari quirks) - silent fail
      console.debug('MediaSession update failed:', err)
    }
  }

  function advance() {
    if (tracks.value.length === 0) return
    if (shuffled.value && tracks.value.length > 1) {
      let next = Math.floor(Math.random() * tracks.value.length)
      let safety = 0
      while (next === currentIndex.value && safety++ < 10) {
        next = Math.floor(Math.random() * tracks.value.length)
      }
      playTrack(next)
      return
    }
    const next = currentIndex.value + 1
    if (next >= tracks.value.length) {
      if (repeat.value === 'all') {
        playTrack(0)
      } else {
        audio.pause()
        audio.currentTime = 0
      }
      return
    }
    playTrack(next)
  }

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files)
    if (!incoming.length) return
    const newTracks: Track[] = []
    incoming.forEach((file, i) => {
      const isAudio =
        (file.type && file.type.startsWith('audio/')) || AUDIO_EXT_RE.test(file.name)
      if (!isAudio) return
      const meta = parseFilename(file.name)
      newTracks.push({
        id: `t-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        url: URL.createObjectURL(file),
        title: meta.title,
        artist: meta.artist,
        duration: 0,
      })
    })
    if (!newTracks.length) return
    const startIndex = tracks.value.length
    tracks.value.push(...newTracks)
    updateMediaSession()
    if (currentIndex.value === -1) {
      playTrack(startIndex)
    }
  }

  function removeTrack(id: string) {
    const idx = tracks.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    const track = tracks.value[idx]
    const wasCurrent = idx === currentIndex.value

    // Detach the URL from the audio element BEFORE revoking so the element
    // doesn't briefly reference an invalid blob URL (which would log a media error).
    if (wasCurrent) {
      audio.pause()
      audio.removeAttribute('src')
      pendingPlay = null
    }
    tracks.value.splice(idx, 1)
    URL.revokeObjectURL(track.url)

    if (!tracks.value.length) {
      currentIndex.value = -1
      isPlaying.value = false
      currentTime.value = 0
      duration.value = 0
      updateMediaSession()
      return
    }

    if (idx < currentIndex.value) {
      currentIndex.value--
    } else if (wasCurrent) {
      const next = idx < tracks.value.length ? idx : 0
      playTrack(next)
    } else if (currentIndex.value >= tracks.value.length) {
      currentIndex.value = tracks.value.length - 1
    }
    updateMediaSession()
  }

  function clearAll() {
    audio.pause()
    audio.removeAttribute('src')
    pendingPlay = null
    const toRevoke = tracks.value
    tracks.value = []
    currentIndex.value = -1
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    toRevoke.forEach((t) => URL.revokeObjectURL(t.url))
    updateMediaSession()
  }

  function playTrack(index: number) {
    if (index < 0 || index >= tracks.value.length) return
    currentIndex.value = index
    audio.src = tracks.value[index].url
    audio.load()
    // Changing src cancels any in-flight play, but the rejection happens on a
    // microtask. Reset the guard proactively so the new src gets a fresh play().
    pendingPlay = null
    tryPlay()
    updateMediaSession()
  }

  function togglePlay() {
    if (tracks.value.length === 0) return
    if (currentIndex.value === -1) {
      playTrack(0)
      return
    }
    if (audio.paused) {
      tryPlay()
    } else {
      audio.pause()
    }
  }

  function nextTrack() {
    if (tracks.value.length === 0) return
    if (shuffled.value && tracks.value.length > 1) {
      let next = Math.floor(Math.random() * tracks.value.length)
      let safety = 0
      while (next === currentIndex.value && safety++ < 10) {
        next = Math.floor(Math.random() * tracks.value.length)
      }
      playTrack(next)
      return
    }
    const next = currentIndex.value + 1
    if (next >= tracks.value.length) {
      if (repeat.value === 'all' && tracks.value.length > 0) playTrack(0)
      else {
        audio.pause()
        if (Number.isFinite(audio.duration)) audio.currentTime = audio.duration
      }
      return
    }
    playTrack(next)
  }

  function previousTrack() {
    if (tracks.value.length === 0) return
    if (audio.currentTime > 3 || currentIndex.value <= 0 || shuffled.value) {
      audio.currentTime = 0
      return
    }
    playTrack(currentIndex.value - 1)
  }

  function seek(percent: number) {
    if (duration.value > 0) {
      const target = Math.max(
        0,
        Math.min(duration.value, (percent / 100) * duration.value)
      )
      audio.currentTime = target
      // Mirror into currentTime immediately so visual surfaces that read from
      // it (progress bar fill, tonearm angle) update during scrubbing,
      // rather than waiting for the slow, irregular `timeupdate` event from
      // the audio element.
      currentTime.value = target
    }
  }

  function setVolume(v: number) {
    const clamped = Math.max(0, Math.min(1, v))
    volume.value = clamped
    if (!isMuted.value) audio.volume = clamped
    if (clamped > 0 && isMuted.value) isMuted.value = false
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    audio.volume = isMuted.value ? 0 : volume.value
  }

  function toggleShuffle() {
    shuffled.value = !shuffled.value
  }

  function cycleRepeat() {
    const modes: RepeatMode[] = ['none', 'all', 'one']
    const i = modes.indexOf(repeat.value)
    repeat.value = modes[(i + 1) % modes.length]
  }

  function setDragOver(v: boolean) {
    isDragOver.value = v
  }

  onUnmounted(() => {
    detachListeners()
    audio.pause()
    audio.removeAttribute('src')
    const toRevoke = tracks.value
    toRevoke.forEach((t) => URL.revokeObjectURL(t.url))
  })

  return {
    // state
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
    // actions
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
  }
}
