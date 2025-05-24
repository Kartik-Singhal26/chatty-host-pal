
import { getPreferredVoice } from './languageConfig';

// Enhanced WebView detection for various native app contexts
export const isWebView = (): boolean => {
  const userAgent = navigator.userAgent;
  const isAndroidWebView = userAgent.includes('wv') || userAgent.includes('WebView') || userAgent.includes('Android');
  const isIOSWebView = userAgent.includes('Version/') && userAgent.includes('Mobile') && !userAgent.includes('Safari');
  const isPWA = (navigator as any).standalone === true;
  const isReactNative = (window as any).ReactNativeWebView !== undefined;
  const isCapacitor = (window as any).Capacitor !== undefined;
  const isCordova = (window as any).cordova !== undefined;
  
  // Additional checks for web-to-native tools
  const isWebToNative = userAgent.includes('WebToNative') || 
                       userAgent.includes('AndroidWebKit') && !userAgent.includes('Chrome') ||
                       (window as any).AndroidInterface !== undefined ||
                       (window as any).NativeApp !== undefined;
  
  return isAndroidWebView || isIOSWebView || isPWA || isReactNative || isCapacitor || isCordova || isWebToNative;
};

// Check if device is Android
export const isAndroid = (): boolean => {
  return /Android/i.test(navigator.userAgent);
};

// Enhanced audio context initialization with multiple fallback strategies
export const enableAutoplay = async (): Promise<void> => {
  try {
    // Create audio context with enhanced compatibility
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext || (window as any).mozAudioContext;
    
    if (!AudioContext) {
      console.warn('AudioContext not supported');
      return;
    }
    
    const audioContext = new AudioContext();
    
    // Resume suspended audio context
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      console.log('Audio context resumed successfully');
    }
    
    // Create silent audio buffer to unlock autoplay
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    // Additional unlock for mobile browsers and native apps
    if (isWebView() || isAndroid()) {
      const silentAudio = new Audio();
      silentAudio.volume = 0;
      silentAudio.muted = true;
      silentAudio.preload = 'auto';
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      
      try {
        const playPromise = silentAudio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        silentAudio.pause();
        console.log('Mobile/Native audio unlocked');
      } catch (error) {
        console.log('Mobile/Native audio unlock failed:', error);
      }
    }
    
    console.log('Audio context fully initialized for autoplay');
  } catch (error) {
    console.log('Audio context initialization failed:', error);
  }
};

// Android native TTS interface
const callAndroidTTS = (text: string, languageCode: string): boolean => {
  try {
    // Common Android WebView interfaces
    if ((window as any).Android && (window as any).Android.speak) {
      (window as any).Android.speak(text, languageCode);
      console.log('Android interface TTS called');
      return true;
    }
    
    if ((window as any).AndroidInterface && (window as any).AndroidInterface.speak) {
      (window as any).AndroidInterface.speak(text, languageCode);
      console.log('AndroidInterface TTS called');
      return true;
    }
    
    if ((window as any).NativeApp && (window as any).NativeApp.speak) {
      (window as any).NativeApp.speak(text, languageCode);
      console.log('NativeApp TTS called');
      return true;
    }
    
    // WebToNative specific interface
    if ((window as any).webToNative && (window as any).webToNative.speak) {
      (window as any).webToNative.speak(text, languageCode);
      console.log('WebToNative TTS called');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Android TTS interface error:', error);
    return false;
  }
};

// Enhanced speech synthesis with comprehensive native app support
export const speakTextWithFallback = async (text: string, languageCode: string = 'hi-IN'): Promise<boolean> => {
  // Enable autoplay capabilities
  await enableAutoplay();

  console.log(`Attempting to speak: "${text}" in language: ${languageCode}`);

  // Primary: Try native Android TTS for WebView/APK
  if (isWebView() || isAndroid()) {
    const nativeSuccess = callAndroidTTS(text, languageCode);
    if (nativeSuccess) {
      return true;
    }
  }

  // Secondary: Web Speech API with enhanced voice selection
  if ('speechSynthesis' in window) {
    try {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        const speakWithVoice = () => {
          const voices = speechSynthesis.getVoices();
          console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
          
          const preferredVoice = getPreferredVoice(voices, languageCode);
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
            utterance.lang = preferredVoice.lang;
            console.log('Selected voice:', preferredVoice.name, preferredVoice.lang);
          } else {
            utterance.lang = languageCode;
            console.log('Using default voice for language:', languageCode);
          }
          
          // Optimize for Indian languages and native apps
          utterance.rate = 0.7; // Slower for better clarity in native apps
          utterance.pitch = 1.0;
          utterance.volume = 1.0; // Full volume for native apps
          
          utterance.onstart = () => {
            console.log('Speech synthesis started');
          };
          
          utterance.onend = () => {
            console.log('Speech synthesis completed');
            resolve(true);
          };
          
          utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            resolve(false);
          };
          
          // Force immediate speech start
          speechSynthesis.speak(utterance);
          
          // Enhanced fallback for native apps
          setTimeout(() => {
            if (speechSynthesis.paused) {
              speechSynthesis.resume();
            }
          }, 100);
          
          // Additional timeout for native apps
          setTimeout(() => {
            if (speechSynthesis.speaking) {
              console.log('Speech still active after timeout');
            } else {
              console.log('Speech completed or failed');
              resolve(false);
            }
          }, 10000); // 10 second timeout
        };

        // Wait for voices to load or use immediately if available
        if (speechSynthesis.getVoices().length === 0) {
          speechSynthesis.onvoiceschanged = () => {
            speechSynthesis.onvoiceschanged = null;
            speakWithVoice();
          };
          
          // Timeout for voice loading
          setTimeout(() => {
            if (speechSynthesis.onvoiceschanged) {
              speechSynthesis.onvoiceschanged = null;
              speakWithVoice();
            }
          }, 2000);
        } else {
          speakWithVoice();
        }
      });
    } catch (error) {
      console.log('Web Speech API failed:', error);
    }
  }

  // Tertiary: Other native app bridges
  if (isWebView()) {
    try {
      // Capacitor native TTS
      if ((window as any).Capacitor && (window as any).Capacitor.Plugins.TextToSpeech) {
        await (window as any).Capacitor.Plugins.TextToSpeech.speak({
          text: text,
          lang: languageCode,
          rate: 0.7,
          pitch: 1.0,
          volume: 1.0
        });
        console.log('Capacitor TTS executed');
        return true;
      }

      // React Native WebView bridge
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SPEAK_TEXT',
          text: text,
          language: languageCode
        }));
        console.log('React Native TTS message sent');
        return true;
      }

      // iOS WebView message handler
      if ((window as any).webkit?.messageHandlers?.TTS) {
        (window as any).webkit.messageHandlers.TTS.postMessage({
          text: text,
          language: languageCode
        });
        console.log('iOS TTS message sent');
        return true;
      }

      // Cordova TTS plugin
      if ((window as any).TTS) {
        (window as any).TTS.speak(text, () => {
          console.log('Cordova TTS success');
        }, (error: any) => {
          console.error('Cordova TTS error:', error);
        });
        return true;
      }

    } catch (error) {
      console.error('Native TTS bridge failed:', error);
    }
  }

  // Final fallback: Visual feedback with audio attempt
  try {
    // Create a simple beep sound for feedback
    if (isWebView() || isAndroid()) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
      
      console.log('Audio feedback beep played');
    }
  } catch (error) {
    console.log('Audio feedback failed:', error);
  }

  console.log('TTS not available - text would be spoken:', text);
  return false;
};

// Enhanced speech recognition with comprehensive language support
export const startSpeechRecognitionWithFallback = (languageCode: string = 'hi-IN'): Promise<SpeechRecognition | null> => {
  return new Promise((resolve) => {
    // Try native Android speech recognition first
    if (isWebView() || isAndroid()) {
      try {
        if ((window as any).Android && (window as any).Android.startSpeechRecognition) {
          (window as any).Android.startSpeechRecognition(languageCode);
          console.log('Android speech recognition started');
        }
        
        if ((window as any).AndroidInterface && (window as any).AndroidInterface.startSpeechRecognition) {
          (window as any).AndroidInterface.startSpeechRecognition(languageCode);
          console.log('AndroidInterface speech recognition started');
        }
      } catch (error) {
        console.error('Native speech recognition failed:', error);
      }
    }

    // Web Speech Recognition API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 3;
        recognition.lang = languageCode;
        
        console.log('Speech recognition initialized for:', languageCode);
        resolve(recognition);
      } catch (error) {
        console.error('Speech recognition initialization failed:', error);
        resolve(null);
      }
    } else {
      console.log('Speech recognition not supported');
      resolve(null);
    }
  });
};

// Enhanced language detection with comprehensive Indian language patterns
export const detectLanguageFromSpeech = (transcript: string): string => {
  const languagePatterns = {
    'hi': /\b(नमस्ते|नमस्कार|धन्यवाद|कृपया|हाँ|नहीं|अच्छा|क्या|कैसे|मैं|आप|यह|वह|अभी|आज|कल|सुप्रभात|शुभ|राम|राम|जय|हिंद)\b/i,
    'bn': /\b(নমস্কার|নমস্তে|ধন্যবাদ|দয়া|করে|হ্যাঁ|না|ভাল|কেমন|আছেন|আমি|আপনি|এই|সেই|আজ|কাল|সুপ্রভাত|জয়|বাংলা)\b/i,
    'te': /\b(నమస్కారం|నమస్తే|ధన్యవాదాలు|దయచేసి|అవును|లేదు|బాగుంది|ఎలా|ఉన్నారు|నేను|మీరు|ఇది|అది|ఈరోజు|రేపు|శుభోదయం|జై|తెలుగు)\b/i,
    'mr': /\b(नमस्कार|नमस्ते|धन्यवाद|कृपया|होय|नाही|चांगले|कसे|आहात|मी|तुम्ही|हे|ते|आज|उद्या|सुप्रभात|जय|महाराष्ट्र)\b/i,
    'ta': /\b(வணக்கம்|நமஸ்கார|நன்றி|தயவுசெய்து|ஆம்|இல்லை|நல்லது|எப்படி|இருக்கீங்க|நான்|நீங்க|இது|அது|இன்று|நாளை|காலை|வணக்கம்|வாழ்த்து)\b/i,
    'gu': /\b(નમસ્તે|નમસ્કાર|આભાર|કૃપા|કરીને|હા|ના|સારું|કેમ|છો|હું|તમે|આ|તે|આજે|કાલે|સુપ્રભાત|જય|ગુજરાત)\b/i,
    'kn': /\b(ನಮಸ್ಕಾರ|ನಮಸ್ತೆ|ಧನ್ಯವಾದಗಳು|ದಯವಿಟ್ಟು|ಹೌದು|ಇಲ್ಲ|ಒಳ್ಳೆಯದು|ಹೇಗೆ|ಇದ್ದೀರಿ|ನಾನು|ನೀವು|ಇದು|ಅದು|ಇಂದು|ನಾಳೆ|ಸುಪ್ರಭಾತ|ಜೈ)\b/i,
    'ml': /\b(നമസ്കാരം|നമസ്തെ|നന്ദി|ദയവായി|അതെ|ഇല്ല|നല്ലത്|എങ്ങനെ|ഉണ്ട്|ഞാൻ|നിങ്ങൾ|ഇത്|അത്|ഇന്ന്|നാളെ|ସുപ്രഭാತം|ജയ്)\b/i,
    'pa': /\b(ਸਤ|ਸ੍ਰੀ|ਅਕਾਲ|ਨਮਸਕਾਰ|ਧੰਨਵਾਦ|ਕਿਰਪਾ|ਕਰਕੇ|ਹਾਂ|ਨਹੀਂ|ਚੰਗਾ|ਕਿਵੇਂ|ਹੋ|ਮੈਂ|ਤੁਸੀਂ|ਇਹ|ਉਹ|ਅੱਜ|ਕੱਲ|ਸ਼ੁਭ|ਸਵੇਰ)\b/i,
    'or': /\b(ନମସ୍କାର|ନମସ୍ତେ|ଧନ୍ୟବାଦ|ଦୟାକରି|ହଁ|ନାହିଁ|ଭଲ|କେମିତି|ଅଛନ୍ତି|ମୁଁ|ଆପଣ|ଏହା|ସେହା|ଆଜି|କାଲି|ସୁପ୍ରଭାତ|ଜୟ)\b/i,
    'as': /\b(নমস্কাৰ|নমস্তে|ধন্যবাদ|অনুগ্ৰহ|কৰি|হয়|নহয়|ভাল|কেনে|আছে|মই|আপুনি|এই|সেই|আজি|কালি|শুভ|ৰাতিপুৱা)\b/i,
    'ur': /\b(آداب|السلام|علیکم|نمسکار|شکریہ|براہ|کرم|ہاں|نہیں|اچھا|کیسے|ہیں|میں|آپ|یہ|وہ|آج|کل|صبح|بخیر)\b/i,
    'sa': /\b(नमस्ते|नमस्कार|धन्यवाद|कृपया|आम्|न|उत्तम|कथम्|अहम्|भवान्|एतत्|तत्|अद्य|श्वः|सुप्रभात|जय)\b/i,
    'ne': /\b(नमस्ते|नमस्कार|धन्यवाद|कृपया|हो|होइन|राम्रो|कस्तो|छ|म|तपाईं|यो|त्यो|आज|भोलि|शुभप्रभात|जय)\b/i,
    'si': /\b(آداب|سلام|شڪريو|مهرباني|ها|نه|سٺو|ڪيئن|آهي|مان|توهان|هي|اهو|اڄ|سڀاڻي|صبح|جو)\b/i,
  };

  // Check for specific language patterns with scoring
  const scores: { [key: string]: number } = {};
  
  for (const [langCode, pattern] of Object.entries(languagePatterns)) {
    const matches = transcript.match(pattern);
    if (matches) {
      scores[langCode] = matches.length;
    }
  }

  // Return language with highest score
  const detectedLang = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b, '');
  
  if (detectedLang && scores[detectedLang] > 0) {
    console.log(`Detected ${detectedLang} language from transcript: "${transcript}" (score: ${scores[detectedLang]})`);
    return detectedLang;
  }

  // Default to Hindi for Indian context
  console.log(`No specific language detected from transcript: "${transcript}", defaulting to Hindi`);
  return 'hi';
};

// Utility to get browser's preferred Indian language
export const getBrowserPreferredIndianLanguage = (): string => {
  const browserLang = navigator.language.toLowerCase();
  const langCode = browserLang.split('-')[0];
  
  // Map browser language codes to our supported Indian languages
  const supportedCodes = ['hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur', 'sa', 'ne', 'si'];
  
  if (supportedCodes.includes(langCode)) {
    console.log('Detected browser language:', langCode);
    return langCode;
  }
  
  // Default to Hindi
  return 'hi';
};

// Create Android interface setup instructions
export const setupAndroidInterface = (): void => {
  if (isAndroid() && isWebView()) {
    console.log(`
=== Android Native TTS Setup Instructions ===

To enable TTS in your Android app, add this to your WebView activity:

1. Add to your MainActivity.java or MainActivity.kt:

// Add TTS interface
webView.addJavascriptInterface(new AndroidTTSInterface(this), "Android");

// Create TTS interface class
public class AndroidTTSInterface {
    private Context context;
    private TextToSpeech tts;
    
    public AndroidTTSInterface(Context context) {
        this.context = context;
        tts = new TextToSpeech(context, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status == TextToSpeech.SUCCESS) {
                    tts.setLanguage(new Locale("hi", "IN"));
                }
            }
        });
    }
    
    @JavascriptInterface
    public void speak(String text, String language) {
        if (tts != null) {
            Locale locale = new Locale(language.split("-")[0], "IN");
            tts.setLanguage(locale);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, null);
        }
    }
}

2. Add permissions to AndroidManifest.xml:
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />

3. Add TTS dependency to build.gradle:
implementation 'androidx.appcompat:appcompat:1.4.0'

=== End Setup Instructions ===
    `);
  }
};
