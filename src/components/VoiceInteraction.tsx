import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, AlertCircle, Languages, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  speakTextWithFallback, 
  startSpeechRecognitionWithFallback, 
  isWebView, 
  isAndroid,
  enableAutoplay, 
  detectLanguageFromSpeech,
  getBrowserPreferredIndianLanguage,
  setupAndroidInterface
} from '@/utils/audioFallback';
import { SUPPORTED_LANGUAGES, Language, getLanguageByCode } from '@/utils/languageConfig';
import LanguageSelector from '@/components/LanguageSelector';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  language?: string;
}

interface VoiceInteractionProps {
  onResponseGenerated?: (response: string) => void;
}

const VoiceInteraction: React.FC<VoiceInteractionProps> = ({ onResponseGenerated }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isWebViewDetected, setIsWebViewDetected] = useState(false);
  const [isAndroidDetected, setIsAndroidDetected] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [autoLanguageDetection, setAutoLanguageDetection] = useState(true);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  
  const recognition = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Initialize on component mount
  useEffect(() => {
    // Generate session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    // Detect environment
    const webViewDetected = isWebView();
    const androidDetected = isAndroid();
    setIsWebViewDetected(webViewDetected);
    setIsAndroidDetected(androidDetected);
    
    // Set default language based on browser preference
    const preferredLangCode = getBrowserPreferredIndianLanguage();
    const preferredLanguage = getLanguageByCode(preferredLangCode);
    if (preferredLanguage) {
      setSelectedLanguage(preferredLanguage);
    }
    
    // Initialize audio
    enableAutoplay();
    
    // Show appropriate warnings/instructions
    if (webViewDetected && androidDetected) {
      setupAndroidInterface();
      toast({
        title: "एंड्रॉयड नेटिव ऐप डिटेक्ट / Android Native App Detected",
        description: "बेहतर ऑडियो के लिए नेटिव इंटीग्रेशन की आवश्यकता / Native integration required for better audio",
        variant: "default",
      });
      
      // Show setup instructions after a delay
      setTimeout(() => setShowSetupInstructions(true), 3000);
    }
    
    console.log('VoiceInteraction initialized:', { 
      sessionId: newSessionId, 
      language: preferredLanguage?.name, 
      isWebView: webViewDetected, 
      isAndroid: androidDetected 
    });
  }, [toast]);

  const initializeSpeechRecognition = useCallback(async () => {
    const recognitionInstance = await startSpeechRecognitionWithFallback(selectedLanguage.speechCode);
    
    if (recognitionInstance) {
      recognition.current = recognitionInstance;
      
      recognition.current.onstart = () => {
        setIsListening(true);
        console.log(`वॉइस रिकॉग्निशन शुरू / Voice recognition started in ${selectedLanguage.nativeName}`);
      };

      recognition.current.onend = () => {
        setIsListening(false);
        console.log('वॉइस रिकॉग्निशन बंद / Voice recognition ended');
      };

      recognition.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        console.log(`ट्रांसक्रिप्ट / Transcript: "${transcript}" (Confidence: ${confidence?.toFixed(2) || 'N/A'})`);
        
        // Auto-detect language if enabled
        let detectedLanguage = selectedLanguage;
        if (autoLanguageDetection) {
          const detectedLangCode = detectLanguageFromSpeech(transcript);
          const newDetectedLanguage = getLanguageByCode(detectedLangCode);
          
          if (newDetectedLanguage && newDetectedLanguage.code !== selectedLanguage.code) {
            detectedLanguage = newDetectedLanguage;
            setSelectedLanguage(newDetectedLanguage);
            console.log(`भाषा बदली गई / Language auto-switched to: ${newDetectedLanguage.nativeName}`);
            
            toast({
              title: "भाषा डिटेक्ट हुई / Language Detected",
              description: `${newDetectedLanguage.nativeName} में स्विच किया गया / Switched to ${newDetectedLanguage.name}`,
              variant: "default",
            });
          }
        }
        
        const userMessage: Message = {
          id: Date.now().toString(),
          text: transcript,
          isUser: true,
          timestamp: new Date(),
          language: detectedLanguage.code
        };
        
        setMessages(prev => [...prev, userMessage]);
        await processWithChatGPT(transcript, detectedLanguage.code);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        const errorMessages = {
          'network': 'नेटवर्क एरर / Network error - कृपया कनेक्शन चेक करें / Please check connection',
          'not-allowed': 'माइक्रोफोन अनुमति चाहिए / Microphone permission required',
          'no-speech': 'कोई आवाज नहीं सुनाई दी / No speech detected',
          'audio-capture': 'ऑडियो कैप्चर एरर / Audio capture error',
          'service-not-allowed': 'स्पीच सेवा उपलब्ध नहीं / Speech service not available'
        };
        
        const errorMessage = errorMessages[event.error as keyof typeof errorMessages] || 
                           `वॉइस एरर / Voice error: ${event.error}`;
        
        toast({
          title: "वॉइस रिकॉग्निशन एरर / Voice Recognition Error",
          description: errorMessage,
          variant: "destructive",
        });
      };
    } else {
      toast({
        title: "वॉइस रिकॉग्निशन उपलब्ध नहीं / Voice Recognition Unavailable",
        description: "कृपया टेक्स्ट इनपुट का उपयोग करें / Please use text input",
        variant: "destructive",
      });
    }
  }, [toast, selectedLanguage, autoLanguageDetection]);

  const processWithChatGPT = async (userInput: string, languageCode: string = selectedLanguage.code) => {
    setIsProcessing(true);
    console.log(`GPT-4o के साथ प्रोसेसिंग / Processing with GPT-4o: "${userInput}" (Language: ${languageCode})`);

    try {
      const { data, error } = await supabase.functions.invoke('chat-gpt', {
        body: { 
          userInput,
          sessionId,
          language: languageCode
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const assistantResponse = data.response;

      const assistantMessage: Message = {
        id: Date.now().toString(),
        text: assistantResponse,
        isUser: false,
        timestamp: new Date(),
        language: languageCode
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (onResponseGenerated) {
        onResponseGenerated(assistantResponse);
      }

      await speakText(assistantResponse, languageCode);

    } catch (error) {
      console.error('ChatGPT API error:', error);
      toast({
        title: "एरर / Error",
        description: "कृपया दोबारा कोशिश करें / Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text: string, languageCode: string = selectedLanguage.code) => {
    setIsSpeaking(true);
    const language = getLanguageByCode(languageCode) || selectedLanguage;
    console.log(`AI बोलना शुरू / AI started speaking in ${language.nativeName}`);
    
    try {
      const speechCode = `${languageCode}-IN`;
      const success = await speakTextWithFallback(text, speechCode);
      
      if (!success && (isWebViewDetected || isAndroidDetected)) {
        toast({
          title: "ऑडियो आउटपुट / Audio Output",
          description: "नेटिव इंटीग्रेशन से बेहतर परिणाम मिलेंगे / Better results with native integration",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
      toast({
        title: "ऑडियो एरर / Audio Error",
        description: "आवाज में समस्या, कृपया नेटिव सेटअप चेक करें / Audio issue, please check native setup",
        variant: "destructive",
      });
    } finally {
      setIsSpeaking(false);
      console.log('AI बोलना समाप्त / AI finished speaking');
    }
  };

  const startListening = async () => {
    if (!recognition.current) {
      await initializeSpeechRecognition();
    }
    
    if (recognition.current && !isListening) {
      try {
        recognition.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast({
          title: "माइक्रोफोन एरर / Microphone Error",
          description: "कृपया माइक अनुमति दें / Please allow microphone access",
          variant: "destructive",
        });
      }
    }
  };

  const stopListening = () => {
    if (recognition.current && isListening) {
      recognition.current.stop();
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleLanguageChange = useCallback((language: Language) => {
    setSelectedLanguage(language);
    if (recognition.current) {
      recognition.current = null;
    }
    console.log(`भाषा बदली गई / Language changed to: ${language.nativeName}`);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Language Selector with Auto-Detection Toggle */}
      <div className="flex justify-center items-center gap-4">
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
        />
        <Button
          variant={autoLanguageDetection ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoLanguageDetection(!autoLanguageDetection)}
          className="gap-2"
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">
            {autoLanguageDetection ? 'ऑटो डिटेक्शन चालू / Auto Detection ON' : 'ऑटो डिटेक्शन बंद / Auto Detection OFF'}
          </span>
        </Button>
      </div>

      {/* Android Setup Warning */}
      {isWebViewDetected && isAndroidDetected && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">
                    एंड्रॉयड APK में चल रहा है / Running in Android APK
                  </p>
                  <p className="text-xs text-orange-600">
                    ऑडियो के लिए नेटिव इंटीग्रेशन आवश्यक / Native integration required for audio
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSetupInstructions(!showSetupInstructions)}
                className="gap-2"
              >
                <Settings className="h-3 w-3" />
                सेटअप / Setup
              </Button>
            </div>
            
            {showSetupInstructions && (
              <div className="mt-4 p-3 bg-white rounded text-xs">
                <h4 className="font-medium text-gray-800 mb-2">Android Integration Setup:</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Add JavaScript interface: <code className="bg-gray-100 px-1">webView.addJavascriptInterface(new AndroidTTSInterface(this), "Android")</code></li>
                  <li>Implement TTS interface with <code className="bg-gray-100 px-1">speak(text, language)</code> method</li>
                  <li>Add RECORD_AUDIO permission to AndroidManifest.xml</li>
                  <li>Initialize TextToSpeech in your Activity</li>
                </ol>
                <p className="mt-2 text-orange-600">
                  चेक कंसोल लॉग्स फॉर डिटेल्ड इंस्ट्रक्शन्स / Check console logs for detailed instructions
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* WebView Warning for non-Android */}
      {isWebViewDetected && !isAndroidDetected && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                नेटिव ऐप मोड में चल रहा है / Running in native app mode. 
                पूर्ण कार्यक्षमता के लिए नेटिव इम्प्लीमेंटेशन आवश्यक / Native implementation required for full functionality.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Controls */}
      <Card className="border-0 bg-gray-50">
        <CardContent className="text-center p-8">
          <div className="flex justify-center items-center gap-6 mb-6">
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              size="lg"
              className={`h-20 w-20 rounded-full transition-all duration-300 border-0 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg scale-110' 
                  : 'bg-black hover:bg-gray-800 shadow-lg hover:scale-105'
              }`}
            >
              {isListening ? (
                <MicOff className="h-8 w-8 text-white" />
              ) : (
                <Mic className="h-8 w-8 text-white" />
              )}
            </Button>

            <Button
              onClick={isSpeaking ? stopSpeaking : undefined}
              disabled={!isSpeaking}
              size="lg"
              variant="outline"
              className="h-16 w-16 rounded-full border-2 bg-white"
            >
              {isSpeaking ? (
                <VolumeX className="h-6 w-6 text-red-500" />
              ) : (
                <Volume2 className="h-6 w-6 text-gray-400" />
              )}
            </Button>
          </div>

          <div className="text-sm">
            {isListening && (
              <p className="text-black font-medium">
                {selectedLanguage.nativeName} में सुन रहा हूँ / Listening in {selectedLanguage.name}...
              </p>
            )}
            {isProcessing && (
              <p className="text-gray-600 font-medium">प्रोसेसिंग / Processing...</p>
            )}
            {isSpeaking && (
              <p className="text-black font-medium">
                {selectedLanguage.nativeName} में बोल रहा हूँ / Speaking in {selectedLanguage.name}...
              </p>
            )}
            {!isListening && !isProcessing && !isSpeaking && (
              <p className="text-gray-500">
                {selectedLanguage.nativeName} में वॉइस इंटरैक्शन शुरू करने के लिए क्लिक करें / 
                Click to start voice interaction in {selectedLanguage.name}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversation Display */}
      {messages.length > 0 && (
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
              <MessageCircle className="h-4 w-4" />
              <span>बातचीत / Conversation</span>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {messages.map((message) => {
                const msgLanguage = message.language ? getLanguageByCode(message.language) : selectedLanguage;
                return (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-sm ${
                        message.isUser
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p>{message.text}</p>
                      <div className="flex justify-between items-center text-xs opacity-70 mt-1">
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                        {msgLanguage && (
                          <span className="ml-2">{msgLanguage.flag}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoiceInteraction;
