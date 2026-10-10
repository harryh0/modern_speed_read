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
    this.view.bindPlayToggle(() => this.handlePlayToggle());
    this.view.bindSetupToggle();

    this.view.updateSlider(this.model.wpm, this.model.pace);
    this.handleTextInput(this.view.getInputText());
  }

  handleTextInput(text) {
    this.clearTimer();

    const normalizedText = this.model.setText(text);

    if (normalizedText !== text) {
      this.view.setInputText(normalizedText);
    }

    this.view.updateCharacterCount(normalizedText.length, this.model.maxCharacters);
    this.view.setPlayButtonDisabled(!this.model.hasWords);
    this.view.updatePlayButton("Play", "▶");
    this.view.renderReady(this.model.words);
  }

  handleWpmChange(wpm) {
    this.model.setWpm(wpm);
    this.view.updateSlider(this.model.wpm, this.model.pace);

    if (this.model.isPlaying) {
      this.scheduleNextWord();
    }
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
    this.renderCurrentWord();
    this.scheduleNextWord();
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
    this.view.renderComplete(this.model.words.length);
    this.view.updatePlayButton("Replay", "↻");
  }

  renderCurrentWord() {
    this.view.renderCurrentWord(
      this.model.text,
      this.model.words,
      this.model.currentIndex
    );
  }

  scheduleNextWord() {
    this.clearTimer();

    this.timerId = window.setTimeout(() => {
      if (!this.model.advanceWord()) {
        this.finishPlayback();
        return;
      }

      this.renderCurrentWord();
      this.scheduleNextWord();
    }, this.model.wordDelay);
  }

  clearTimer() {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
