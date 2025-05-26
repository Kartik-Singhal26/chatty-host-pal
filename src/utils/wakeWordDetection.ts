export class WakeWordDetector {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onWakeWordDetected: () => void;
  private onError: (error: string) => void;
  private wakeWords = ['astrova', 'astrava', 'astrova ai'];
  private isDestroyed = false;
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    onWakeWordDetected: () => void,
    onError: (error: string) => void
  ) {
    this.onWakeWordDetected = onWakeWordDetected;
    this.onError = onError;
  }

  async start(): Promise<boolean> {
    if (this.isDestroyed) {
      console.log('🚫 Wake word detector already destroyed, not starting');
      return false;
    }

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      this.onError('Wake word detection not supported in this browser');
      return false;
    }

    // Clear any existing restart timeout
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    try {
      // Stop existing recognition if any
      if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        if (this.isDestroyed) return;
        this.isListening = true;
        console.log('🎤 Wake word detection started');
      };

      this.recognition.onresult = (event) => {
        if (this.isDestroyed) return;
        
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
            // Stop wake word detection temporarily when wake word is detected
            this.stop();
            this.onWakeWordDetected();
          }
        }
      };

      this.recognition.onerror = (event) => {
        if (this.isDestroyed) return;
        
        console.log('Wake word detection error:', event.error);
        
        // Only handle specific errors, ignore "aborted" when it's intentional
        if (event.error === 'aborted') {
          console.log('Wake word detection aborted (likely intentional)');
          return;
        }
        
        if (event.error === 'not-allowed') {
          this.onError('Microphone permission denied for wake word detection');
          return;
        }
        
        // For other errors, just log them but don't restart immediately
        console.log(`Wake word error: ${event.error}, will retry in 3 seconds`);
      };

      this.recognition.onend = () => {
        if (this.isDestroyed) return;
        
        this.isListening = false;
        console.log('🔇 Wake word detection ended');
        
        // Auto-restart wake word detection after a delay if not destroyed
        if (!this.isDestroyed) {
          this.restartTimeout = setTimeout(() => {
            if (!this.isDestroyed) {
              console.log('🔄 Restarting wake word detection...');
              this.start();
            }
          }, 3000); // 3 second delay to prevent rapid restarts
        }
      };

      this.recognition.start();
      return true;
    } catch (error) {
      if (this.isDestroyed) return false;
      console.error('Failed to start wake word detection:', error);
      this.onError(`Failed to start wake word detection: ${error}`);
      return false;
    }
  }

  stop() {
    console.log('🛑 Stopping wake word detection');
    
    // Clear restart timeout
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.log('Error stopping wake word recognition:', error);
      }
      this.recognition = null;
    }
    this.isListening = false;
  }

  destroy() {
    console.log('💥 Destroying wake word detector');
    this.isDestroyed = true;
    this.stop();
  }

  getStatus() {
    return this.isListening && !this.isDestroyed;
  }

  // Method to restart after push-to-talk is done
  restart() {
    if (this.isDestroyed) return;
    console.log('🔄 Restarting wake word detection after push-to-talk');
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.start();
      }
    }, 1000); // 1 second delay
  }
}
