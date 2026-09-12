export interface DialogueLine {
  speaker: string;
  text: string;
  avatar?: string;
}

export class DialogueSystem {
  private overlay: HTMLElement | null = null;
  private speakerElement: HTMLElement | null = null;
  private textElement: HTMLElement | null = null;
  private avatarElement: HTMLElement | null = null;

  private queue: DialogueLine[] = [];
  private currentLine: DialogueLine | null = null;
  private isTyping: boolean = false;
  private typingTimer: number | null = null;
  private charIndex: number = 0;
  private onCompleteCallback?: () => void;

  public isActive: boolean = false;

  constructor() {
    this.overlay = document.getElementById('dialog-overlay');
    this.speakerElement = document.getElementById('dialog-speaker');
    this.textElement = document.getElementById('dialog-text');
    this.avatarElement = document.getElementById('dialog-avatar');

    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  public startDialogue(lines: DialogueLine[], onComplete?: () => void): void {
    if (!lines || lines.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    this.queue = [...lines];
    this.onCompleteCallback = onComplete;
    this.isActive = true;

    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }

    this.showNextLine();
  }

  private showNextLine(): void {
    if (this.queue.length === 0) {
      this.finishDialogue();
      return;
    }

    this.currentLine = this.queue.shift()!;
    if (this.speakerElement) {
      this.speakerElement.textContent = this.currentLine.speaker;
    }

    if (this.avatarElement) {
      if (this.currentLine.avatar) {
        this.avatarElement.innerHTML = this.currentLine.avatar;
      } else {
        this.avatarElement.innerHTML = '<span class="avatar-line">[ T-0 ]</span><span class="avatar-line">[ REC ]</span>';
      }
    }

    if (this.textElement) {
      this.textElement.textContent = '';
    }

    this.charIndex = 0;
    this.isTyping = true;
    this.typeNextChar();
  }

  private typeNextChar = (): void => {
    if (!this.currentLine || !this.textElement || !this.isTyping) return;

    if (this.charIndex < this.currentLine.text.length) {
      this.textElement.textContent += this.currentLine.text.charAt(this.charIndex);
      this.charIndex++;
      this.typingTimer = window.setTimeout(this.typeNextChar, 25);
    } else {
      this.completeTyping();
    }
  };

  private completeTyping(): void {
    if (this.typingTimer !== null) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    if (this.currentLine && this.textElement) {
      this.textElement.textContent = this.currentLine.text;
    }
    this.isTyping = false;
  }

  public advance(): void {
    if (!this.isActive) return;

    if (this.isTyping) {
      // Se ainda estiver digitando, completa a frase imediatamente
      this.completeTyping();
    } else {
      // Se a frase já foi completada, avança para a próxima
      this.showNextLine();
    }
  }

  private finishDialogue(): void {
    this.isActive = false;
    this.isTyping = false;
    if (this.typingTimer !== null) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }

    if (this.onCompleteCallback) {
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = undefined;
      cb();
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isActive) return;

    if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.advance();
    }
  };

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown, true);
    if (this.typingTimer !== null) {
      clearTimeout(this.typingTimer);
    }
  }
}
