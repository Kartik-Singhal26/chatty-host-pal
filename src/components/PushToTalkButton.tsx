
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { WakeWordDetector } from '@/utils/wakeWordDetection';
import { 
  startSpeechRecognitionWithFallback, 
  speakTextWithFallback, 
  enableAutoplay 
} from '@/utils/audioFallback';

interface PushToTalkButtonProps {
  onTranscript: (text: string) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  isProcessing: boolean;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  language: string;
  wakeWordEnabled?: boolean;
}

const PushToTalkButton: React.FC<PushToTalkButtonProps> = ({
  onTranscript,
  onStartListening,
  onStopListening,
  isProcessing,
  isSpeaking,
  onStopSpeaking,
  language,
  wakeWordEnabled = true
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const recognition = useRef<SpeechRecognition | null>(null);
  const wakeWordDetector = useRef<WakeWordDetector | null>(null);
  const { toast } = useToast();

  // Initialize wake word detection
  useEffect(() => {
    if (wakeWordEnabled) {
      const handleWakeWord = () => {
        console.log('🎯 Wake word detected - starting conversation');
        toast({
          title: "Wake Word Detected",
          description: "Starting conversation...",
          variant: "default",
        });
        startListening();
      };

      const handleWakeWordError = (error: string) => {
        console.error('Wake word error:', error);
        setWakeWordActive(false);
      };

      wakeWordDetector.current = new WakeWordDetector(handleWakeWord, handleWakeWordError);
      
      // Auto-start wake word detection
      enableAutoplay().then(() => {
        wakeWordDetector.current?.start().then(success => {
          if (success) {
            setWakeWordActive(true);
            console.log('🎤 Wake word detection active');
          }
        });
      });
    }

    return () => {
      wakeWordDetector.current?.destroy();
    };
  }, [wakeWordEnabled]);

  const initializeSpeechRecognition = useCallback(async () => {
    const recognitionInstance = await startSpeechRecognitionWithFallback(language);
    
    if (recognitionInstance) {
      recognition.current = recognitionInstance;
      
      recognition.current.onstart = () => {
        setIsListening(true);
        onStartListening();
        console.log('🎤 Push-to-talk speech recognition started');
      };

      recognition.current.onend = () => {
        setIsListening(false);
        onStopListening();
        console.log('🔇 Push-to-talk speech recognition ended');
        
        // Restart wake word detection after push-to-talk ends
        if (wakeWordDetector.current && wakeWordEnabled) {
          wakeWordDetector.current.restart();
        }
      };

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        console.log(`📝 Push-to-talk transcript: "${transcript}" (Confidence: ${confidence?.toFixed(2) || 'N/A'})`);
        onTranscript(transcript);
      };

      recognition.current.onerror = (event) => {
        console.error('Push-to-talk speech recognition error:', event.error);
        setIsListening(false);
        onStopListening();
        
        // Only show error for non-aborted errors
        if (event.error !== 'aborted') {
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
        }
        
        // Restart wake word detection after error
        if (wakeWordDetector.current && wakeWordEnabled) {
          wakeWordDetector.current.restart();
        }
      };
    }
  }, [language, onTranscript, onStartListening, onStopListening, toast, wakeWordEnabled]);

  const startListening = async () => {
    // Stop wake word detection when starting push-to-talk
    if (wakeWordDetector.current) {
      wakeWordDetector.current.stop();
      setWakeWordActive(false);
    }

    if (!recognition.current) {
      await initializeSpeechRecognition();
    }
    
    if (recognition.current && !isListening) {
      try {
        recognition.current.start();
      } catch (error) {
        console.error('Error starting push-to-talk recognition:', error);
        toast({
          title: "Microphone Error",
          description: "Please allow microphone access",
          variant: "destructive",
        });
        
        // Restart wake word detection if push-to-talk fails
        if (wakeWordDetector.current && wakeWordEnabled) {
          wakeWordDetector.current.restart();
          setWakeWordActive(true);
        }
      }
    }
  };

  const stopListening = () => {
    if (recognition.current && isListening) {
      recognition.current.stop();
    }
  };

  const handlePushToTalk = () => {
    if (isListening) {
      stopListening();
      setIsPushToTalk(false);
    } else {
      startListening();
      setIsPushToTalk(true);
    }
  };

  const handleStopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    onStopSpeaking();
  };

  // Restart wake word detection when component becomes idle
  useEffect(() => {
    if (!isListening && !isProcessing && !isSpeaking && wakeWordEnabled && !wakeWordActive) {
      const timer = setTimeout(() => {
        if (wakeWordDetector.current && !isListening && !isProcessing && !isSpeaking) {
          wakeWordDetector.current.start().then(success => {
            if (success) {
              setWakeWordActive(true);
              console.log('🎤 Wake word detection reactivated');
            }
          });
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isListening, isProcessing, isSpeaking, wakeWordEnabled, wakeWordActive]);

  return (
    <Card className="border-0 bg-gray-50">
      <CardContent className="text-center p-6">
        {/* Wake word indicator */}
        {wakeWordEnabled && (
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wakeWordActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-xs text-gray-500">
              {wakeWordActive ? 'Wake word "Astrova" active' : 'Wake word inactive'}
            </span>
          </div>
        )}

        {/* Main control buttons */}
        <div className="flex justify-center items-center gap-4 mb-4">
          {/* Push-to-talk button */}
          <Button
            onClick={handlePushToTalk}
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

          {/* Stop speaking button */}
          <Button
            onClick={isSpeaking ? handleStopSpeaking : undefined}
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

        {/* Status display */}
        <div className="text-sm">
          {isListening && (
            <p className="text-black font-medium">
              🎤 Listening for your voice...
            </p>
          )}
          {isProcessing && (
            <p className="text-gray-600 font-medium">
              🤖 Processing with GPT-4...
            </p>
          )}
          {isSpeaking && (
            <p className="text-black font-medium">
              🗣️ AI is speaking...
            </p>
          )}
          {!isListening && !isProcessing && !isSpeaking && (
            <div>
              <p className="text-gray-500 mb-2">
                {wakeWordEnabled 
                  ? 'Say "Astrova" or click mic to start' 
                  : 'Click microphone to start listening'
                }
              </p>
              <p className="text-xs text-gray-400">
                Powered by GPT-4 with conversation memory
              </p>
            </div>
          )}
        </div>

        {/* Wake word instructions */}
        {wakeWordEnabled && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Voice Activation</span>
            </div>
            <p className="text-xs text-blue-600">
              Say "Astrova" to start hands-free conversation, or use push-to-talk button
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PushToTalkButton;
