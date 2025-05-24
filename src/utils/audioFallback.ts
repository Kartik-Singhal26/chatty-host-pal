
import { getPreferredVoice } from './languageConfig';

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

// Enhanced speech synthesis with autoplay support and language selection
export const speakTextWithFallback = async (text: string, languageCode: string = 'en-US'): Promise<boolean> => {
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
          const preferredVoice = getPreferredVoice(voices, languageCode);
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
            utterance.lang = preferredVoice.lang;
          } else {
            utterance.lang = languageCode;
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

// Enhanced speech recognition with fallback and language support
export const startSpeechRecognitionWithFallback = (languageCode: string = 'en-US'): Promise<SpeechRecognition | null> => {
  return new Promise((resolve, reject) => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = languageCode;
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

// Auto-detect language from speech patterns
export const detectLanguageFromSpeech = (transcript: string): string => {
  const languagePatterns = {
    'hi': /\b(नमस्ते|धन्यवाद|कृपया|हाँ|नहीं|अच्छा|क्या हाल है|सुप्रभात)\b/i,
    'bn': /\b(নমস্কার|ধন্যবাদ|দয়া করে|হ্যাঁ|না|ভাল|কেমন আছেন|সুপ্রভাত)\b/i,
    'te': /\b(నమస్కారం|ధన్యవాదాలు|దయచేసి|అవును|లేదు|బాగుంది|ఎలా ఉన్నారు|శుభోదయం)\b/i,
    'mr': /\b(नमस्कार|धन्यवाद|कृपया|होय|नाही|चांगले|कसे आहात|सुप्रभात)\b/i,
    'ta': /\b(வணக்கம்|நன்றி|தயவுசெய்து|ஆம்|இல்லை|நல்லது|எப்படி இருக்கீங்க|காலை வணக்கம்)\b/i,
    'gu': /\b(નમસ્તે|આભાર|કૃપા કરીને|હા|ના|સારું|કેમ છો|સુપ્રભાત)\b/i,
    'kn': /\b(ನಮಸ್ಕಾರ|ಧನ್ಯವಾದಗಳು|ದಯವಿಟ್ಟು|ಹೌದು|ಇಲ್ಲ|ಒಳ್ಳೆಯದು|ಹೇಗಿದ್ದೀರಿ|ಸುಪ್ರಭಾತ)\b/i,
    'ml': /\b(നമസ്കാരം|നന്ദി|ദയവായി|അതെ|ഇല്ല|നല്ലത്|എങ്ങനെയുണ്ട്|സുപ്രഭാതം)\b/i,
    'pa': /\b(ਸਤ ਸ੍ਰੀ ਅਕਾਲ|ਧੰਨਵਾਦ|ਕਿਰਪਾ ਕਰਕੇ|ਹਾਂ|ਨਹੀਂ|ਚੰਗਾ|ਕਿਵੇਂ ਹੋ|ਸ਼ੁਭ ਸਵੇਰ)\b/i,
    'or': /\b(ନମସ୍କାର|ଧନ୍ୟବାଦ|ଦୟାକରି|ହଁ|ନାହିଁ|ଭଲ|କେମିତି ଅଛନ୍ତି|ସୁପ୍ରଭାତ)\b/i,
    'as': /\b(নমস্কাৰ|ধন্যবাদ|অনুগ্ৰহ কৰি|হয়|নহয়|ভাল|কেনে আছে|শুভ ৰাতিপুৱা)\b/i,
    'ur': /\b(آداب|شکریہ|براہ کرم|ہاں|نہیں|اچھا|کیسے ہیں|صبح بخیر)\b/i,
  };

  // Check for specific language patterns
  for (const [langCode, pattern] of Object.entries(languagePatterns)) {
    if (pattern.test(transcript)) {
      console.log(`Detected language: ${langCode} from transcript: "${transcript}"`);
      return langCode;
    }
  }

  // Default to English if no pattern matches
  console.log(`No language detected from transcript: "${transcript}", defaulting to English`);
  return 'en';
};
