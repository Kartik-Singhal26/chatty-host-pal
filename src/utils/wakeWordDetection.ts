
export class WakeWordDetector {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onWakeWordDetected: () => void;
  private onError: (error: string) => void;
  private wakeWords = ['astrova', 'astrava', 'astrova ai'];
  private isDestroyed = false;
  private restartTimeout: number | null = null;
  private isRestarting = false;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 3;

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

    if (this.isListening || this.isRestarting) {
      console.log('🔄 Wake word detection already active or restarting');
      return false;
    }

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      this.onError('Wake word detection not supported in this browser');
      return false;
    }

    // Clear any existing restart timeout
    if (this.restartTimeout) {
      window.clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    // Prevent too many consecutive errors
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      console.log('🚫 Too many consecutive errors, stopping wake word detection');
      return false;
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
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        if (this.isDestroyed) return;
        this.isListening = true;
        this.isRestarting = false;
        this.consecutiveErrors = 0;
        console.log('🎤 Wake word detection started successfully');
      };

      this.recognition.onresult = (event) => {
        if (this.isDestroyed) return;
        
        const results = Array.from(event.results);
        
        // Process all results, focusing on the most recent
        for (let i = results.length - 1; i >= 0; i--) {
          const result = results[i];
          if (result && result[0]) {
            const transcript = result[0].transcript.toLowerCase().trim();
            console.log(`🎧 Wake word listener heard: "${transcript}" (confidence: ${result[0].confidence?.toFixed(2) || 'N/A'})`);
            
            // Check if any wake word is detected with better matching
            const wakeWordDetected = this.wakeWords.some(word => {
              const cleanTranscript = transcript.replace(/[^\w\s]/g, '').toLowerCase();
              const cleanWord = word.toLowerCase();
              return cleanTranscript.includes(cleanWord) || 
                     this.levenshteinDistance(cleanTranscript, cleanWord) <= 2;
            });
            
            if (wakeWordDetected) {
              console.log(`✅ Wake word detected in: "${transcript}"`);
              this.stop();
              this.onWakeWordDetected();
              return;
            }
          }
        }
      };

      this.recognition.onerror = (event) => {
        if (this.isDestroyed) return;
        
        console.log('Wake word detection error:', event.error);
        
        // Handle specific errors differently
        if (event.error === 'aborted') {
          console.log('Wake word detection aborted (likely intentional)');
          return;
        }
        
        if (event.error === 'not-allowed') {
          this.consecutiveErrors++;
          this.onError('Microphone permission denied for wake word detection');
          return;
        }
        
        if (event.error === 'network') {
          this.consecutiveErrors++;
          console.log('Wake word network error, will retry');
        } else {
          this.consecutiveErrors++;
          console.log(`Wake word error: ${event.error}, consecutive errors: ${this.consecutiveErrors}`);
        }
      };

      this.recognition.onend = () => {
        if (this.isDestroyed) return;
        
        this.isListening = false;
        console.log('🔇 Wake word detection ended');
        
        // Only auto-restart if not too many errors and not destroyed
        if (!this.isDestroyed && this.consecutiveErrors < this.maxConsecutiveErrors) {
          this.scheduleRestart();
        }
      };

      this.recognition.start();
      return true;
    } catch (error) {
      if (this.isDestroyed) return false;
      this.consecutiveErrors++;
      console.error('Failed to start wake word detection:', error);
      this.onError(`Failed to start wake word detection: ${error}`);
      return false;
    }
  }

  private scheduleRestart() {
    if (this.isDestroyed || this.isRestarting) return;
    
    this.isRestarting = true;
    const delay = Math.min(3000 + (this.consecutiveErrors * 2000), 10000); // Exponential backoff, max 10s
    
    this.restartTimeout = window.setTimeout(() => {
      if (!this.isDestroyed) {
        console.log(`🔄 Restarting wake word detection... (attempt after ${this.consecutiveErrors} errors)`);
        this.start();
      }
    }, delay);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  stop() {
    console.log('🛑 Stopping wake word detection');
    
    // Clear restart timeout
    if (this.restartTimeout) {
      window.clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    this.isRestarting = false;

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
    this.consecutiveErrors = 0;
    this.stop();
  }

  getStatus() {
    return this.isListening && !this.isDestroyed;
  }

  // Method to restart after push-to-talk is done
  restart() {
    if (this.isDestroyed) return;
    console.log('🔄 Restarting wake word detection after push-to-talk');
    
    // Reset error count when manually restarting
    this.consecutiveErrors = 0;
    
    this.restartTimeout = window.setTimeout(() => {
      if (!this.isDestroyed) {
        this.start();
      }
    }, 1000); // 1 second delay
  }

  // Method to reset error count (useful for manual recovery)
  resetErrorCount() {
    this.consecutiveErrors = 0;
    console.log('🔄 Reset wake word error count');
  }
}
