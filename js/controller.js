export class SpeedReaderController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.timerId = null;
  }

  initialize() {
    this.view.bindTextInput((text) => this.handleTextInput(text));
    this.view.bindPaste(this.model.maxCharacters);
    this.view.bindWpmChange((wpm) => this.handleWpmChange(wpm));
    this.view.bindChunkSizeChange((size) => this.handleChunkSizeChange(size));
    this.view.bindPlayToggle(() => this.handlePlayToggle());
    this.view.bindPlaybackKeyboard(() => this.handlePlayToggle());
    this.view.bindSetupToggle();

    this.view.updateWpmControl(this.model.wpm, this.model.pace);
    this.handleTextInput(this.view.getInputText());
  }

  handleTextInput(text) {
    this.clearTimer();

    const normalizedText = this.model.setText(text);

    if (normalizedText !== text) {
      this.view.setInputText(normalizedText);
    }

    this.view.updateCharacterCount(normalizedText.length, this.model.maxCharacters);
    this.view.updateChunkControl(this.model.wordCount, this.model.chunkSize);
    this.view.setPlayButtonDisabled(!this.model.hasWords);
    this.view.updatePlayButton("Play", "▶");
    this.view.renderReady(this.model.words, this.model.chunkSize);
  }

  handleWpmChange(wpm) {
    this.model.setWpm(wpm);
    this.view.updateWpmControl(this.model.wpm, this.model.pace);

    if (this.model.isPlaying) {
      this.scheduleNextPlaybackStep();
    }
  }

  handleChunkSizeChange(chunkSize) {
    this.model.setChunkSize(chunkSize);
    this.view.updateChunkControl(this.model.wordCount, this.model.chunkSize);

    if (this.model.isPlaying) {
      this.renderCurrentChunk();
      this.scheduleNextPlaybackStep();
      return;
    }

    if (this.model.isPaused) {
      this.renderCurrentChunk();
      return;
    }

    this.view.renderReady(this.model.words, this.model.chunkSize);
  }

  handlePlayToggle() {
    if (this.model.isPlaying) {
      this.pausePlayback();
      return;
    }

    this.startPlayback();
  }

  startPlayback() {
    if (!this.model.startPlayback()) {
      return;
    }

    this.view.setInputEditable(false);
    this.view.updatePlayButton("Pause", "Ⅱ");
    this.renderCurrentChunk();
    this.scheduleNextPlaybackStep();
  }

  pausePlayback() {
    this.clearTimer();
    this.model.pausePlayback();
    this.view.setInputEditable(true);
    this.view.updatePlayButton("Resume", "▶");
  }

  finishPlayback() {
    this.clearTimer();
    this.model.completePlayback();
    this.view.setInputEditable(true);
    this.view.updatePlayButton("Replay", "↻");
  }

  renderCurrentChunk() {
    this.view.renderCurrentChunk(
      this.model.text,
      this.model.words,
      this.model.currentIndex,
      this.model.chunkSize,
      this.model.focusedIndex
    );
  }

  renderWordFocus() {
    this.view.renderWordFocus(
      this.model.text,
      this.model.words,
      this.model.currentIndex,
      this.model.currentChunk.length,
      this.model.focusedIndex
    );
  }

  scheduleNextPlaybackStep() {
    this.clearTimer();

    this.timerId = window.setTimeout(() => {
      if (this.model.advanceFocus()) {
        this.renderWordFocus();
        this.scheduleNextPlaybackStep();
        return;
      }

      if (!this.model.advanceChunk()) {
        this.finishPlayback();
        return;
      }

      this.renderCurrentChunk();
      this.scheduleNextPlaybackStep();
    }, this.model.wordDelay);
  }

  clearTimer() {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
