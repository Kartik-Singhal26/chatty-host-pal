
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { speakTextWithFallback, startSpeechRecognitionWithFallback, isWebView } from '@/utils/audioFallback';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
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
  
  const recognition = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Check if running in WebView and show appropriate warnings
  useEffect(() => {
    const webViewDetected = isWebView();
    setIsWebViewDetected(webViewDetected);
    
    if (webViewDetected) {
      console.log('WebView detected - using fallback audio methods');
      toast({
        title: "Native App Detected",
        description: "Voice features may require native implementation for optimal performance.",
        variant: "default",
      });
    }
  }, [toast]);

  // Generate unique session ID on component mount
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    console.log('Generated session ID:', newSessionId);
  }, []);

  const initializeSpeechRecognition = useCallback(async () => {
    const recognitionInstance = await startSpeechRecognitionWithFallback();
    
    if (recognitionInstance) {
      recognition.current = recognitionInstance;
      
      recognition.current.onstart = () => {
        setIsListening(true);
        console.log('Voice recognition started');
      };

      recognition.current.onend = () => {
        setIsListening(false);
        console.log('Voice recognition ended');
      };

      recognition.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Transcript:', transcript);
        
        const userMessage: Message = {
          id: Date.now().toString(),
          text: transcript,
          isUser: true,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        await processWithChatGPT(transcript);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Please try speaking again or use text input.",
          variant: "destructive",
        });
      };
    } else {
      toast({
        title: "Voice Recognition Unavailable",
        description: "Please use text input or enable microphone permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const processWithChatGPT = async (userInput: string) => {
    setIsProcessing(true);
    console.log('Processing with ChatGPT-4o:', userInput, 'Session:', sessionId);

    try {
      const { data, error } = await supabase.functions.invoke('chat-gpt', {
        body: { 
          userInput,
          sessionId 
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
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (onResponseGenerated) {
        onResponseGenerated(assistantResponse);
      }

      await speakText(assistantResponse);

    } catch (error) {
      console.error('Error calling ChatGPT API:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text: string) => {
    setIsSpeaking(true);
    console.log('AI started speaking');
    
    try {
      const success = await speakTextWithFallback(text);
      if (!success && isWebViewDetected) {
        // Show visual feedback that the text would be spoken
        toast({
          title: "Voice Output",
          description: "Text ready for native speech synthesis",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
    } finally {
      setIsSpeaking(false);
      console.log('AI finished speaking');
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
          description: "Please allow microphone access and try again.",
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

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* WebView Warning */}
      {isWebViewDetected && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                Running in native app mode. Voice features may require native implementation for full functionality.
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
            {isListening && <p className="text-black font-medium">Listening...</p>}
            {isProcessing && <p className="text-gray-600 font-medium">Processing...</p>}
            {isSpeaking && <p className="text-black font-medium">Speaking...</p>}
            {!isListening && !isProcessing && !isSpeaking && (
              <p className="text-gray-500">Click to start voice interaction</p>
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
              {messages.map((message) => (
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
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoiceInteraction;
