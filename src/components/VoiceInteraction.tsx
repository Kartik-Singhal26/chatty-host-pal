import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Phone, Coffee, Bed, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  knowledgeUsed?: number;
}

interface VoiceInteractionProps {
  onResponseGenerated?: (response: string) => void;
}

const VoiceInteraction: React.FC<VoiceInteractionProps> = ({ onResponseGenerated }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Good day! I'm Elena, your personal hospitality assistant. I'm here to ensure your stay is absolutely perfect. Whether you need dining recommendations, local insights, or assistance with our amenities, I'm delighted to help. How may I be of service today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  
  const recognition = useRef<SpeechRecognition | null>(null);
  const synthesis = useRef<SpeechSynthesis>(window.speechSynthesis);
  const { toast } = useToast();

  // Generate unique session ID on component mount
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    console.log('Generated session ID:', newSessionId);
  }, []);

  const initializeSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';

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
          description: "Please try speaking again.",
          variant: "destructive",
        });
      };
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
      const knowledgeUsed = data.knowledgeUsed || 0;

      const assistantMessage: Message = {
        id: Date.now().toString(),
        text: assistantResponse,
        isUser: false,
        timestamp: new Date(),
        knowledgeUsed
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (onResponseGenerated) {
        onResponseGenerated(assistantResponse);
      }

      // Speak the response with professional female voice
      speakText(assistantResponse);

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

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      synthesis.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Enhanced voice settings for professional female voice
      const voices = synthesis.current.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('woman') ||
        voice.name.toLowerCase().includes('zira') ||
        voice.name.toLowerCase().includes('eva') ||
        voice.name.toLowerCase().includes('samantha')
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      // Professional voice settings
      utterance.rate = 0.85; // Slightly slower for elegance
      utterance.pitch = 1.1; // Slightly higher pitch
      utterance.volume = 0.9; // Clear volume
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log('Elena started speaking');
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('Elena finished speaking');
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
      };

      synthesis.current.speak(utterance);
    }
  };

  const startListening = () => {
    if (!recognition.current) {
      initializeSpeechRecognition();
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
    if (synthesis.current) {
      synthesis.current.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Voice Controls */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-center text-blue-800 flex items-center justify-center gap-2">
            <Phone className="h-6 w-6" />
            Elena - Your Hospitality Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center items-center gap-4">
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              size="lg"
              className={`h-16 w-16 rounded-full transition-all duration-300 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-200' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
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
              className="h-16 w-16 rounded-full border-2"
            >
              {isSpeaking ? (
                <VolumeX className="h-8 w-8 text-red-500" />
              ) : (
                <Volume2 className="h-8 w-8 text-gray-400" />
              )}
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            {isListening && <p className="text-blue-600 font-medium animate-pulse">🎤 Elena is listening...</p>}
            {isProcessing && <p className="text-amber-600 font-medium">🧠 Elena is thinking...</p>}
            {isSpeaking && <p className="text-green-600 font-medium">🔊 Elena is speaking...</p>}
            {!isListening && !isProcessing && !isSpeaking && (
              <p className="text-gray-500">Click the microphone to speak with Elena</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50 hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <Coffee className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <h3 className="font-semibold text-emerald-800">Room Service</h3>
            <p className="text-sm text-emerald-600">Dining & beverages</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50 hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <Bed className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-800">Concierge</h3>
            <p className="text-sm text-purple-600">Local recommendations</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50 hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <MessageCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <h3 className="font-semibold text-orange-800">Guest Services</h3>
            <p className="text-sm text-orange-600">Amenities & support</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversation Display */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center gap-2">
            Conversation with Elena
            {sessionId && (
              <span className="text-xs text-gray-500 font-normal">
                Session: {sessionId.slice(-8)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                    {message.knowledgeUsed !== undefined && message.knowledgeUsed > 0 && (
                      <div className="flex items-center gap-1 text-xs opacity-70">
                        <Brain className="h-3 w-3" />
                        <span>{message.knowledgeUsed}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceInteraction;
