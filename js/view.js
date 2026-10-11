const PLAYBACK_KEYS = new Set(["Enter", " "]);
const DISPLAY_FONT_SCALE = {
  minimumRem: 2.4,
  maximumRem: 6.4,
  viewportRatio: 0.1
};

function requireElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

function calculateSliderProgress(value, minimum, maximum) {
  if (minimum === maximum) {
    return 100;
  }

  return ((value - minimum) / (maximum - minimum)) * 100;
}

function formatWordCount(count) {
  return `${count} ${count === 1 ? "word" : "words"}`;
}

function isInteractiveElement(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable
      || target.matches("input, textarea, select, button"));
}

export class SpeedReaderView {
  constructor() {
    this.setupToggle = requireElement("#setup-toggle");
    this.setupToggleIcon = requireElement("#setup-toggle-icon");
    this.setupControls = requireElement("#setup-controls");
    this.textInput = requireElement("#text-input");
    this.characterCount = requireElement("#character-count");
    this.wpmControl = requireElement("#wpm-control");
    this.wpmSlider = requireElement("#wpm-slider");
    this.wpmOutput = requireElement("#wpm-output");
    this.paceLabel = requireElement("#pace-label");
    this.chunkControls = requireElement("#chunk-controls");
    this.chunkSlider = requireElement("#chunk-slider");
    this.chunkOutput = requireElement("#chunk-output");
    this.displayWord = requireElement("#display-word");
    this.playButton = requireElement("#play-button");
    this.buttonIcon = requireElement("#button-icon");
    this.buttonLabel = requireElement("#button-label");
    this.currentWordCount = 0;
    this.currentChunkSize = 1;

    window.addEventListener("resize", () => {
      this.updateDisplayFontSize(this.currentWordCount, this.currentChunkSize);
    });
  }

  getInputText() {
    return this.textInput.innerText.replace(/\r/g, "");
  }

  setInputText(text) {
    this.textInput.textContent = text;
    this.placeCaretAtEnd(this.textInput);
  }

  placeCaretAtEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  bindTextInput(handler) {
    this.textInput.addEventListener("input", () => {
      handler(this.getInputText());
    });
  }

  bindPaste(maxCharacters) {
    this.textInput.addEventListener("paste", (event) => {
      event.preventDefault();

      const selection = window.getSelection();

      if (
        !selection
        || !selection.rangeCount
        || !this.textInput.contains(selection.anchorNode)
      ) {
        return;
      }

      const pastedText = event.clipboardData.getData("text/plain");
      const selectedCharacters = selection.toString().length;
      const availableCharacters =
        maxCharacters - this.getInputText().length + selectedCharacters;
      const insertedText = pastedText.slice(0, Math.max(0, availableCharacters));
      const range = selection.getRangeAt(0);

      range.deleteContents();
      range.insertNode(document.createTextNode(insertedText));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      this.textInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  bindWpmChange(handler) {
    this.wpmSlider.addEventListener("input", () => {
      handler(Number(this.wpmSlider.value));
    });
  }

  bindChunkSizeChange(handler) {
    this.chunkSlider.addEventListener("input", () => {
      handler(Number(this.chunkSlider.value));
    });
  }

  bindPlayToggle(handler) {
    this.playButton.addEventListener("click", handler);
  }

  bindPlaybackKeyboard(handler) {
    document.addEventListener("keydown", (event) => {
      if (
        !PLAYBACK_KEYS.has(event.key)
        || event.repeat
        || isInteractiveElement(event.target)
        || this.playButton.disabled
      ) {
        return;
      }

      event.preventDefault();
      handler();
    });
  }

  bindSetupToggle() {
    this.setupToggle.addEventListener("click", () => this.toggleSetupControls());
    this.setupControls.addEventListener("transitionend", (event) => {
      const isExpanded = this.setupToggle.getAttribute("aria-expanded") === "true";

      if (event.propertyName === "max-height" && isExpanded) {
        this.setupControls.style.maxHeight = "none";
      }
    });
  }

  toggleSetupControls() {
    const isExpanded = this.setupToggle.getAttribute("aria-expanded") === "true";
    const nextLabel = isExpanded
      ? "Show text and speed controls"
      : "Hide text and speed controls";

    if (isExpanded) {
      this.setupControls.style.maxHeight = `${this.setupControls.scrollHeight}px`;
      void this.setupControls.offsetHeight;
      this.setupControls.classList.add("is-collapsed");
      this.setupControls.setAttribute("aria-hidden", "true");
      this.setupControls.inert = true;
      this.setupControls.style.maxHeight = "0px";
    } else {
      this.setupControls.classList.remove("is-collapsed");
      this.setupControls.removeAttribute("aria-hidden");
      this.setupControls.inert = false;
      this.setupControls.style.maxHeight = `${this.setupControls.scrollHeight}px`;
    }

    this.setupToggle.setAttribute("aria-expanded", String(!isExpanded));
    this.setupToggle.setAttribute("aria-label", nextLabel);
    this.setupToggle.title = nextLabel;
    this.setupToggleIcon.classList.toggle("is-collapsed", isExpanded);
  }

  updateCharacterCount(length, maximum) {
    this.characterCount.textContent = `${length} / ${maximum}`;
  }

  updateWpmControl(wpm, pace) {
    const min = Number(this.wpmSlider.min);
    const max = Number(this.wpmSlider.max);
    const progress = calculateSliderProgress(wpm, min, max);

    this.wpmSlider.value = String(wpm);
    this.wpmControl.style.setProperty("--slider-progress", `${progress}%`);
    this.wpmSlider.style.setProperty("--slider-progress", `${progress}%`);
    this.wpmSlider.style.setProperty("--slider-color", pace.color);
    this.paceLabel.style.setProperty("--slider-color", pace.color);
    this.wpmOutput.value = String(wpm);
    this.paceLabel.textContent = pace.name;
  }

  updateChunkControl(wordCount, chunkSize) {
    this.currentWordCount = wordCount;
    this.currentChunkSize = chunkSize;
    this.chunkControls.hidden = wordCount === 0;
    this.updateDisplayFontSize(wordCount, chunkSize);

    if (wordCount === 0) {
      return;
    }

    const progress = calculateSliderProgress(chunkSize, 1, wordCount);

    this.chunkSlider.max = String(wordCount);
    this.chunkSlider.value = String(chunkSize);
    this.chunkSlider.style.setProperty("--slider-progress", `${progress}%`);
    this.chunkOutput.value = formatWordCount(chunkSize);
  }

  updateDisplayFontSize(wordCount, chunkSize) {
    if (wordCount === 0) {
      this.displayWord.style.removeProperty("--display-font-size");
      return;
    }

    const rootFontSize = Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize
    );
    const inputFontSize = Number.parseFloat(
      window.getComputedStyle(this.textInput).fontSize
    );
    const maximumFontSize = Math.min(
      Math.max(
        window.innerWidth * DISPLAY_FONT_SCALE.viewportRatio,
        rootFontSize * DISPLAY_FONT_SCALE.minimumRem
      ),
      rootFontSize * DISPLAY_FONT_SCALE.maximumRem
    );
    const scaleProgress = wordCount === 1
      ? 1
      : Math.log(chunkSize) / Math.log(wordCount);
    const displayFontSize =
      maximumFontSize - (maximumFontSize - inputFontSize) * scaleProgress;

    this.displayWord.style.setProperty(
      "--display-font-size",
      `${displayFontSize}px`
    );
  }

  setInputEditable(isEditable) {
    this.textInput.contentEditable = String(isEditable);
  }

  updatePlayButton(label, icon) {
    this.buttonLabel.textContent = label;
    this.buttonIcon.textContent = icon;
    this.playButton.setAttribute("aria-label", label);
    this.playButton.title = label;
  }

  setPlayButtonDisabled(isDisabled) {
    this.playButton.disabled = isDisabled;
  }

  renderReady(words, chunkSize) {
    this.textInput.querySelectorAll(".active-word").forEach((word) => {
      word.classList.remove("active-word", "focus-word");
      word.removeAttribute("aria-current");
    });

    if (words.length > 0) {
      this.displayWord.textContent =
        words.slice(0, chunkSize).map((word) => word.text).join(" ");
      return;
    }

    this.displayWord.textContent = "Your words appear here";
  }

  renderCurrentChunk(text, words, currentIndex, chunkSize, focusedIndex) {
    const currentChunk = words.slice(currentIndex, currentIndex + chunkSize);

    if (currentChunk.length === 0) {
      return;
    }

    this.displayWord.textContent = currentChunk.map((word) => word.text).join(" ");
    this.renderHighlightedInput(
      text,
      words,
      currentIndex,
      currentChunk.length,
      focusedIndex
    );
  }

  renderWordFocus(text, words, activeIndex, activeCount, focusedIndex) {
    this.renderHighlightedInput(
      text,
      words,
      activeIndex,
      activeCount,
      focusedIndex
    );
  }

  renderHighlightedInput(
    text,
    words,
    activeIndex,
    activeCount,
    focusedIndex
  ) {
    const fragment = document.createDocumentFragment();
    let cursor = 0;

    words.forEach((word, index) => {
      if (word.start > cursor) {
        fragment.append(document.createTextNode(text.slice(cursor, word.start)));
      }

      const wordElement = document.createElement("span");
      wordElement.textContent = text.slice(word.start, word.end);

      if (index >= activeIndex && index < activeIndex + activeCount) {
        wordElement.className = "active-word";
        wordElement.setAttribute("aria-current", "true");

        if (activeCount > 1 && index === focusedIndex) {
          wordElement.classList.add("focus-word");
        }
      }

      fragment.append(wordElement);
      cursor = word.end;
    });

    if (cursor < text.length) {
      fragment.append(document.createTextNode(text.slice(cursor)));
    }

    this.textInput.replaceChildren(fragment);
  }
}
