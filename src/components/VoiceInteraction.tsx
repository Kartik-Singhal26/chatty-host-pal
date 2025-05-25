
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  speakTextWithFallback, 
  startSpeechRecognitionWithFallback, 
  enableAutoplay, 
  detectLanguageFromSpeech,
  getBrowserPreferredIndianLanguage
} from '@/utils/audioFallback';
import { SUPPORTED_LANGUAGES, Language, getLanguageByCode, getPreferredVoice } from '@/utils/languageConfig';
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
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [autoLanguageDetection, setAutoLanguageDetection] = useState(true);
  
  const recognition = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Initialize on component mount
  useEffect(() => {
    // Generate session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    // Set default language to English
    const englishLanguage = getLanguageByCode('en') || SUPPORTED_LANGUAGES[0];
    setSelectedLanguage(englishLanguage);
    
    // Initialize audio
    enableAutoplay();
    
    console.log('🚀 VoiceInteraction initialized:', { 
      sessionId: newSessionId, 
      language: englishLanguage?.name
    });
  }, [toast]);

  const initializeSpeechRecognition = useCallback(async () => {
    const recognitionInstance = await startSpeechRecognitionWithFallback(selectedLanguage.speechCode);
    
    if (recognitionInstance) {
      recognition.current = recognitionInstance;
      
      recognition.current.onstart = () => {
        setIsListening(true);
        console.log(`Voice recognition started in ${selectedLanguage.nativeName}`);
      };

      recognition.current.onend = () => {
        setIsListening(false);
        console.log('Voice recognition ended');
      };

      recognition.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        console.log(`Transcript: "${transcript}" (Confidence: ${confidence?.toFixed(2) || 'N/A'})`);
        
        // Auto-detect language if enabled
        let detectedLanguage = selectedLanguage;
        if (autoLanguageDetection) {
          const detectedLangCode = detectLanguageFromSpeech(transcript);
          const newDetectedLanguage = getLanguageByCode(detectedLangCode);
          
          if (newDetectedLanguage && newDetectedLanguage.code !== selectedLanguage.code) {
            detectedLanguage = newDetectedLanguage;
            setSelectedLanguage(newDetectedLanguage);
            console.log(`Language auto-switched to: ${newDetectedLanguage.nativeName}`);
            
            toast({
              title: "Language Detected",
              description: `Switched to ${newDetectedLanguage.name}`,
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
          'network': 'Network error - Please check connection',
          'not-allowed': 'Microphone permission required',
          'no-speech': 'No speech detected',
          'audio-capture': 'Audio capture error',
          'service-not-allowed': 'Speech service not available'
        };
        
        const errorMessage = errorMessages[event.error as keyof typeof errorMessages] || 
                           `Voice error: ${event.error}`;
        
        toast({
          title: "Voice Recognition Error",
          description: errorMessage,
          variant: "destructive",
        });
      };
    } else {
      toast({
        title: "Voice Recognition Unavailable",
        description: "Please use text input",
        variant: "destructive",
      });
    }
  }, [toast, selectedLanguage, autoLanguageDetection]);

  const processWithChatGPT = async (userInput: string, languageCode: string = selectedLanguage.code) => {
    setIsProcessing(true);
    console.log(`🤖 Processing with GPT-4o-mini: "${userInput}" (Language: ${languageCode})`);

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
      console.log(`💬 GPT Response: "${assistantResponse}"`);

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
      console.error('❌ ChatGPT API error:', error);
      toast({
        title: "Error",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text: string, languageCode: string = selectedLanguage.code) => {
    setIsSpeaking(true);
    const language = getLanguageByCode(languageCode) || selectedLanguage;
    console.log(`🗣️ AI starting to speak in ${language.nativeName} with Indian accent`);
    
    try {
      // Enhanced text chunking for better audio continuity
      const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
      const chunks: string[] = [];
      let currentChunk = '';
      const maxChunkLength = 120; // Reduced for better audio processing
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkLength && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence.trim();
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence.trim();
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      console.log(`📝 Speaking in ${chunks.length} optimized chunks`);

      // Get all available voices and find the best Indian accent voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = getPreferredVoice(voices, language.speechCode, 'female');
      
      // Speak each chunk with enhanced error handling and timing
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🗣️ Speaking chunk ${i + 1}/${chunks.length}: "${chunk.substring(0, 30)}..."`);
        
        await new Promise((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(chunk);
          
          // Configure voice for Indian accent and optimal speech
          utterance.lang = language.speechCode;
          utterance.rate = 0.9; // Slightly slower for clarity
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
          
          utterance.onend = () => {
            console.log(`✅ Completed chunk ${i + 1}`);
            resolve(true);
          };
          
          utterance.onerror = (error) => {
            console.warn(`⚠️ TTS error for chunk ${i + 1}:`, error);
            resolve(false); // Continue to next chunk
          };
          
          // Clear any pending speech before starting new chunk
          speechSynthesis.cancel();
          
          // Small delay to ensure proper sequencing
          setTimeout(() => {
            speechSynthesis.speak(utterance);
          }, 100);
        });
        
        // Brief pause between chunks for natural flow
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
    } catch (error) {
      console.error('💥 Speech synthesis error:', error);
      toast({
        title: "Audio Error",
        description: "Could not play audio response",
        variant: "destructive",
      });
    } finally {
      setIsSpeaking(false);
      console.log('🔇 AI finished speaking all chunks');
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
          title: "Microphone Error",
          description: "Please allow microphone access",
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
    console.log(`Language changed to: ${language.nativeName}`);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Language Controls - Removed Voice Gender Selector */}
      <div className="flex justify-center items-center gap-4 flex-wrap">
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
            {autoLanguageDetection ? 'Auto Detection ON' : 'Auto Detection OFF'}
          </span>
        </Button>
      </div>

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
                Listening in {selectedLanguage.name}...
              </p>
            )}
            {isProcessing && (
              <p className="text-gray-600 font-medium">Processing with GPT-4o-mini...</p>
            )}
            {isSpeaking && (
              <p className="text-black font-medium">
                Speaking in {selectedLanguage.name} with Indian accent...
              </p>
            )}
            {!isListening && !isProcessing && !isSpeaking && (
              <div>
                <p className="text-gray-500 mb-2">
                  Click to start voice interaction in {selectedLanguage.name} with trained Indian accent
                </p>
                <p className="text-xs text-gray-400">
                  Powered by GPT-4o-mini with strict pricing enforcement
                </p>
              </div>
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
              <span>Conversation</span>
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
