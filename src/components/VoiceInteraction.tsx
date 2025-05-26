
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MessageCircle, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  speakTextWithFallback, 
  enableAutoplay, 
  detectLanguageFromSpeech,
} from '@/utils/audioFallback';
import { SUPPORTED_LANGUAGES, Language, getLanguageByCode } from '@/utils/languageConfig';
import LanguageSelector from '@/components/LanguageSelector';
import PushToTalkButton from '@/components/PushToTalkButton';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [autoLanguageDetection, setAutoLanguageDetection] = useState(true);
  const [isListening, setIsListening] = useState(false);
  
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

  const processWithChatGPT = async (userInput: string, languageCode: string = selectedLanguage.code) => {
    setIsProcessing(true);
    console.log(`🤖 Processing with GPT-4: "${userInput}" (Language: ${languageCode})`);

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
    console.log(`🗣️ AI starting to speak: "${text}"`);
    
    try {
      await speakTextWithFallback(text, languageCode, 'female');
    } catch (error) {
      console.error('💥 Speech synthesis error:', error);
      toast({
        title: "Audio Error",
        description: "Could not play audio response",
        variant: "destructive",
      });
    } finally {
      setIsSpeaking(false);
      console.log('🔇 AI finished speaking');
    }
  };

  const handleTranscript = useCallback(async (transcript: string) => {
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
  }, [selectedLanguage, autoLanguageDetection, toast]);

  const handleStartListening = () => {
    setIsListening(true);
  };

  const handleStopListening = () => {
    setIsListening(false);
  };

  const handleStopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleLanguageChange = useCallback((language: Language) => {
    setSelectedLanguage(language);
    console.log(`Language changed to: ${language.nativeName}`);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Language Controls */}
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

      {/* Enhanced Push-to-Talk Voice Controls */}
      <PushToTalkButton
        onTranscript={handleTranscript}
        onStartListening={handleStartListening}
        onStopListening={handleStopListening}
        isProcessing={isProcessing}
        isSpeaking={isSpeaking}
        onStopSpeaking={handleStopSpeaking}
        language={selectedLanguage.speechCode}
        wakeWordEnabled={true}
      />

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
