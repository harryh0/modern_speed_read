export const MAX_CHARACTERS = 1000;

const PACE_TIERS = [
  { minimum: 100, name: "Novice", color: "#6b7280" },
  { minimum: 200, name: "Average", color: "#2563eb" },
  { minimum: 300, name: "Proficient", color: "#16a34a" },
  { minimum: 500, name: "Expert", color: "#d97706" },
  { minimum: 700, name: "Skimming...", color: "#dc2626" }
];

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
    this.playbackState = "stopped";
    this.wpm = wpm;
  }

  get currentWord() {
    return this.words[this.currentIndex] ?? null;
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
    return this.words.length > 0;
  }

  get isPlaying() {
    return this.playbackState === "playing";
  }

  setText(text) {
    this.text = text.slice(0, this.maxCharacters);
    this.words = tokenize(this.text);
    this.currentIndex = 0;
    this.playbackState = "stopped";
    return this.text;
  }

  setWpm(wpm) {
    this.wpm = wpm;
  }

  startPlayback() {
    if (!this.hasWords) {
      return false;
    }

    if (this.playbackState === "complete" || this.currentIndex >= this.words.length) {
      this.currentIndex = 0;
    }

    this.playbackState = "playing";
    return true;
  }

  pausePlayback() {
    this.playbackState = "paused";
  }

  completePlayback() {
    this.playbackState = "complete";
  }

  advanceWord() {
    if (this.currentIndex >= this.words.length - 1) {
      return false;
    }

    this.currentIndex += 1;
    return true;
  }
}
