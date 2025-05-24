
// Utility to detect if we're running in a WebView/native app
export const isWebView = (): boolean => {
  const userAgent = navigator.userAgent;
  return (
    userAgent.includes('wv') || // Android WebView
    userAgent.includes('Version/') && userAgent.includes('Mobile') || // iOS WebView
    (navigator as any).standalone === true || // iOS PWA
    (window as any).ReactNativeWebView !== undefined // React Native WebView
  );
};

// Enable autoplay and prepare audio context
export const enableAutoplay = async (): Promise<void> => {
  try {
    // Create and resume audio context to enable autoplay
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Pre-create a silent audio to unlock autoplay
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
    
    console.log('Audio context unlocked for autoplay');
  } catch (error) {
    console.log('Audio context unlock failed:', error);
  }
};

// Enhanced speech synthesis with autoplay support
export const speakTextWithFallback = async (text: string): Promise<boolean> => {
  // Enable autoplay if possible
  await enableAutoplay();

  // First try the Web Speech API
  if ('speechSynthesis' in window) {
    try {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Wait for voices to load
        const speakWithVoice = () => {
          const voices = speechSynthesis.getVoices();
          const femaleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('female') || 
            voice.name.toLowerCase().includes('woman') ||
            voice.name.toLowerCase().includes('zira') ||
            voice.name.toLowerCase().includes('eva') ||
            voice.name.toLowerCase().includes('samantha') ||
            voice.name.toLowerCase().includes('alloy')
          );
          
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }
          
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
          utterance.volume = 0.9;
          
          utterance.onend = () => resolve(true);
          utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            resolve(false);
          };
          
          // Force speech to start immediately
          speechSynthesis.speak(utterance);
        };

        if (speechSynthesis.getVoices().length === 0) {
          speechSynthesis.onvoiceschanged = speakWithVoice;
        } else {
          speakWithVoice();
        }
      });
    } catch (error) {
      console.log('Web Speech API failed, trying fallback:', error);
    }
  }

  // Fallback: Try to use native bridge if available
  if (isWebView()) {
    try {
      // For React Native WebView
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SPEAK_TEXT',
          text: text
        }));
        return true;
      }

      // For Android WebView with JavaScript interface
      if ((window as any).AndroidInterface && (window as any).AndroidInterface.speakText) {
        (window as any).AndroidInterface.speakText(text);
        return true;
      }

      // For iOS WebView with message handler
      if ((window as any).webkit && (window as any).webkit.messageHandlers && (window as any).webkit.messageHandlers.speakText) {
        (window as any).webkit.messageHandlers.speakText.postMessage(text);
        return true;
      }
    } catch (error) {
      console.error('Native bridge TTS failed:', error);
    }
  }

  // Final fallback: Show visual feedback that speech would occur
  console.log('TTS not available, text would be spoken:', text);
  return false;
};

// Enhanced speech recognition with fallback
export const startSpeechRecognitionWithFallback = (): Promise<SpeechRecognition | null> => {
  return new Promise((resolve, reject) => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        resolve(recognition);
      } catch (error) {
        console.error('Speech recognition initialization failed:', error);
        resolve(null);
      }
    } else if (isWebView()) {
      // For native apps, we might need to use a different approach
      console.log('Speech recognition not available in WebView, consider using native bridge');
      resolve(null);
    } else {
      resolve(null);
    }
  });
};
