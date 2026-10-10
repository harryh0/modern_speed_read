function requireElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

export class SpeedReaderView {
  constructor() {
    this.setupToggle = requireElement("#setup-toggle");
    this.setupToggleIcon = requireElement("#setup-toggle-icon");
    this.setupControls = requireElement("#setup-controls");
    this.textInput = requireElement("#text-input");
    this.characterCount = requireElement("#character-count");
    this.wpmSlider = requireElement("#wpm-slider");
    this.wpmOutput = requireElement("#wpm-output");
    this.paceLabel = requireElement("#pace-label");
    this.displayWord = requireElement("#display-word");
    this.readerProgress = requireElement("#reader-progress");
    this.playButton = requireElement("#play-button");
    this.buttonIcon = requireElement("#button-icon");
    this.buttonLabel = requireElement("#button-label");
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

      if (!selection.rangeCount || !this.textInput.contains(selection.anchorNode)) {
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

  bindPlayToggle(handler) {
    this.playButton.addEventListener("click", handler);
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

  updateSlider(wpm, pace) {
    const min = Number(this.wpmSlider.min);
    const max = Number(this.wpmSlider.max);
    const progress = ((wpm - min) / (max - min)) * 100;

    this.wpmSlider.value = String(wpm);
    this.wpmSlider.style.setProperty("--slider-progress", `${progress}%`);
    this.wpmSlider.style.setProperty("--slider-color", pace.color);
    this.paceLabel.style.setProperty("--slider-color", pace.color);
    this.wpmOutput.value = `${wpm} WPM`;
    this.wpmOutput.textContent = `${wpm} WPM`;
    this.paceLabel.textContent = pace.name;
  }

  setInputEditable(isEditable) {
    this.textInput.contentEditable = String(isEditable);
  }

  updatePlayButton(label, icon) {
    this.buttonLabel.textContent = label;
    this.buttonIcon.textContent = icon;
  }

  setPlayButtonDisabled(isDisabled) {
    this.playButton.disabled = isDisabled;
  }

  renderReady(words) {
    const activeWord = this.textInput.querySelector(".active-word");
    activeWord?.classList.remove("active-word");
    activeWord?.removeAttribute("aria-current");

    if (words.length > 0) {
      this.displayWord.textContent = words[0].text;
      this.readerProgress.textContent =
        `${words.length} ${words.length === 1 ? "word" : "words"} ready`;
      return;
    }

    this.displayWord.textContent = "Your words appear here";
    this.readerProgress.textContent = "Ready";
  }

  renderCurrentWord(text, words, currentIndex) {
    const currentWord = words[currentIndex];

    if (!currentWord) {
      return;
    }

    this.displayWord.textContent = currentWord.text;
    this.readerProgress.textContent = `Word ${currentIndex + 1} of ${words.length}`;
    this.renderHighlightedInput(text, words, currentIndex);
  }

  renderHighlightedInput(text, words, activeIndex) {
    const fragment = document.createDocumentFragment();
    let cursor = 0;

    words.forEach((word, index) => {
      if (word.start > cursor) {
        fragment.append(document.createTextNode(text.slice(cursor, word.start)));
      }

      const wordElement = document.createElement("span");
      wordElement.textContent = text.slice(word.start, word.end);

      if (index === activeIndex) {
        wordElement.className = "active-word";
        wordElement.setAttribute("aria-current", "true");
      }

      fragment.append(wordElement);
      cursor = word.end;
    });

    if (cursor < text.length) {
      fragment.append(document.createTextNode(text.slice(cursor)));
    }

    this.textInput.replaceChildren(fragment);

    this.textInput
      .querySelector(".active-word")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  renderComplete(wordCount) {
    this.readerProgress.textContent =
      `Complete · ${wordCount} ${wordCount === 1 ? "word" : "words"}`;
  }
}
