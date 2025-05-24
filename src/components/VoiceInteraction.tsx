
import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Phone, Coffee, Bed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Welcome to our hospitality assistant! I can help you with room service, amenities, local recommendations, and more. How may I assist you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [apiKey, setApiKey] = useState('');
  
  const recognition = useRef<SpeechRecognition | null>(null);
  const synthesis = useRef<SpeechSynthesis>(window.speechSynthesis);
  const { toast } = useToast();

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
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to use ChatGPT-4o.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    console.log('Processing with ChatGPT-4o:', userInput);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a helpful hospitality assistant for a luxury hotel. You can help guests with:
              - Room service orders and dining recommendations
              - Hotel amenities and services information
              - Local attractions and recommendations
              - Concierge services
              - Housekeeping requests
              - Check-in/check-out assistance
              - Spa and wellness bookings
              - Transportation arrangements
              
              Respond in a warm, professional, and helpful manner. Keep responses concise but informative. Always ask if there's anything else you can help with.`
            },
            {
              role: 'user',
              content: userInput
            }
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const assistantResponse = data.choices[0].message.content;

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

      // Speak the response
      speakText(assistantResponse);

    } catch (error) {
      console.error('Error calling ChatGPT API:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please check your API key and try again.",
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
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log('Started speaking');
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('Finished speaking');
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
      {/* API Key Input */}
      {!apiKey && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              OpenAI API Key Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-amber-700 text-sm">
                Please enter your OpenAI API key to enable ChatGPT-4o integration for intelligent hospitality assistance.
              </p>
              <input
                type="password"
                placeholder="Enter your OpenAI API key"
                className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Controls */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-center text-blue-800 flex items-center justify-center gap-2">
            <Phone className="h-6 w-6" />
            Hospitality Voice Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center items-center gap-4">
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing || !apiKey}
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
            {isListening && <p className="text-blue-600 font-medium animate-pulse">🎤 Listening...</p>}
            {isProcessing && <p className="text-amber-600 font-medium">🧠 Processing with ChatGPT-4o...</p>}
            {isSpeaking && <p className="text-green-600 font-medium">🔊 Speaking response...</p>}
            {!isListening && !isProcessing && !isSpeaking && (
              <p className="text-gray-500">Click the microphone to start voice interaction</p>
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
          <CardTitle className="text-gray-800">Conversation History</CardTitle>
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
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
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
