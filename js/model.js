export const MAX_CHARACTERS = 1000;

const PLAYBACK_STATE = {
  stopped: "stopped",
  playing: "playing",
  paused: "paused",
  complete: "complete"
};

const PACE_TIERS = [
  { minimum: 100, name: "Novice", color: "#6b7280" },
  { minimum: 200, name: "Average", color: "#2563eb" },
  { minimum: 300, name: "Proficient", color: "#16a34a" },
  { minimum: 500, name: "Expert", color: "#d97706" },
  { minimum: 700, name: "Skimming...", color: "#dc2626" }
];

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function tokenize(text) {
  const tokens = [];
  const matcher = /\S+/g;
  let match;

  while ((match = matcher.exec(text)) !== null) {
    tokens.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return tokens;
}

export class SpeedReaderModel {
  constructor({ wpm = 300, maxCharacters = MAX_CHARACTERS } = {}) {
    this.maxCharacters = maxCharacters;
    this.text = "";
    this.words = [];
    this.currentIndex = 0;
    this.focusedIndex = 0;
    this.chunkSize = 1;
    this.playbackState = PLAYBACK_STATE.stopped;
    this.wpm = wpm;
  }

  get wordCount() {
    return this.words.length;
  }

  get currentChunk() {
    return this.words.slice(this.currentIndex, this.currentIndex + this.chunkSize);
  }

  get pace() {
    let activeTier = PACE_TIERS[0];

    for (const tier of PACE_TIERS) {
      if (this.wpm < tier.minimum) {
        break;
      }

      activeTier = tier;
    }

    return activeTier;
  }

  get wordDelay() {
    return 60000 / this.wpm;
  }

  get hasWords() {
    return this.wordCount > 0;
  }

  get isPlaying() {
    return this.playbackState === PLAYBACK_STATE.playing;
  }

  get isPaused() {
    return this.playbackState === PLAYBACK_STATE.paused;
  }

  setText(text) {
    this.text = text.slice(0, this.maxCharacters);
    this.words = tokenize(this.text);
    this.chunkSize = clamp(this.chunkSize, 1, Math.max(this.wordCount, 1));
    this.resetPosition();
    this.playbackState = PLAYBACK_STATE.stopped;
    return this.text;
  }

  setWpm(wpm) {
    this.wpm = wpm;
  }

  setChunkSize(chunkSize) {
    this.chunkSize = clamp(chunkSize, 1, Math.max(this.wordCount, 1));
    this.focusedIndex = this.currentIndex;
  }

  startPlayback() {
    if (!this.hasWords) {
      return false;
    }

    if (
      this.playbackState === PLAYBACK_STATE.complete
      || this.currentIndex >= this.wordCount
    ) {
      this.resetPosition();
    }

    this.playbackState = PLAYBACK_STATE.playing;
    return true;
  }

  pausePlayback() {
    this.playbackState = PLAYBACK_STATE.paused;
  }

  completePlayback() {
    this.playbackState = PLAYBACK_STATE.complete;
  }

  advanceChunk() {
    const nextIndex = this.currentIndex + this.currentChunk.length;

    if (nextIndex >= this.wordCount) {
      return false;
    }

    this.currentIndex = nextIndex;
    this.focusedIndex = nextIndex;
    return true;
  }

  advanceFocus() {
    const lastChunkIndex = this.currentIndex + this.currentChunk.length - 1;

    if (this.focusedIndex >= lastChunkIndex) {
      return false;
    }

    this.focusedIndex += 1;
    return true;
  }

  resetPosition() {
    this.currentIndex = 0;
    this.focusedIndex = 0;
  }
}
