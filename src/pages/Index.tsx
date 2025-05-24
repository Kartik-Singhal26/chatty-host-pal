
import React from 'react';
import VoiceInteraction from '@/components/VoiceInteraction';
import { Zap, Mic, Brain } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-black p-2 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Astrova.ai</h1>
                <p className="text-sm text-gray-500">AI Voice Assistant</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <h2 className="text-5xl font-light text-gray-900 mb-6 leading-tight">
              Advanced AI
              <span className="block font-normal text-gray-600">Voice Assistant</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Experience next-generation voice interaction powered by sophisticated AI technology. 
              Speak naturally, get intelligent responses.
            </p>
          </div>

          {/* Voice Interaction Component */}
          <div className="mb-16">
            <VoiceInteraction 
              onResponseGenerated={(response) => {
                console.log('Response generated:', response);
              }}
            />
          </div>

          {/* Minimal Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Voice Recognition</h3>
              <p className="text-sm text-gray-500">Advanced speech processing</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">AI Intelligence</h3>
              <p className="text-sm text-gray-500">GPT-4o powered responses</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Real-time</h3>
              <p className="text-sm text-gray-500">Instant voice synthesis</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
