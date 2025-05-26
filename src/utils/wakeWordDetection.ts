
export class WakeWordDetector {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onWakeWordDetected: () => void;
  private onError: (error: string) => void;
  private wakeWords = ['astrova', 'astrava', 'astrova ai'];

  constructor(
    onWakeWordDetected: () => void,
    onError: (error: string) => void
  ) {
    this.onWakeWordDetected = onWakeWordDetected;
    this.onError = onError;
  }

  async start(): Promise<boolean> {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      this.onError('Wake word detection not supported in this browser');
      return false;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('🎤 Wake word detection started');
      };

      this.recognition.onresult = (event) => {
        const results = Array.from(event.results);
        const latestResult = results[results.length - 1];
        
        if (latestResult) {
          const transcript = latestResult[0].transcript.toLowerCase().trim();
          console.log('🎧 Wake word listener heard:', transcript);
          
          // Check if any wake word is detected
          const wakeWordDetected = this.wakeWords.some(word => 
            transcript.includes(word)
          );
          
          if (wakeWordDetected) {
            console.log('✅ Wake word "Astrova" detected!');
            this.onWakeWordDetected();
          }
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Wake word detection error:', event.error);
        if (event.error !== 'no-speech') {
          this.onError(`Wake word detection error: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Auto-restart wake word detection
        if (this.recognition) {
          setTimeout(() => this.start(), 1000);
        }
      };

      this.recognition.start();
      return true;
    } catch (error) {
      this.onError(`Failed to start wake word detection: ${error}`);
      return false;
    }
  }

  stop() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
      this.isListening = false;
      console.log('🔇 Wake word detection stopped');
    }
  }

  getStatus() {
    return this.isListening;
  }
}
