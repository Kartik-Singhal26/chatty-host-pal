
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getEnvironmentVariables } from './config.ts';
import { DatabaseService } from './database.ts';
import { OpenAIService } from './openai.ts';
import { PromptBuilder } from './prompt-builder.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { userInput, sessionId = 'default-session' } = await req.json();

    if (!userInput) {
      throw new Error('User input is required');
    }

    console.log('Processing request for session:', sessionId);

    // Initialize services
    const { openAIApiKey, supabaseUrl, supabaseServiceKey } = getEnvironmentVariables();
    const dbService = new DatabaseService(supabaseUrl, supabaseServiceKey);
    const openAIService = new OpenAIService(openAIApiKey);
    const promptBuilder = new PromptBuilder();

    // Get conversation history
    const conversationHistory = await dbService.getConversationHistory(sessionId);
    console.log('Loaded conversation history:', conversationHistory.length, 'messages');

    // Get hotel pricing data for STRICT price adherence
    const hotelData = await dbService.getHotelPricingData();
    console.log('Loaded hotel data:', hotelData.length, 'items');

    // Find relevant knowledge
    const relevantKnowledge = await dbService.findRelevantKnowledge(userInput);
    console.log('Found relevant knowledge:', relevantKnowledge.length, 'items');

    // Build enhanced system prompt with ABSOLUTE STRICT pricing guidelines
    const systemPrompt = promptBuilder.buildSystemPrompt(relevantKnowledge, hotelData, userInput);

    // Convert conversation history to OpenAI format
    const chatHistory = conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));

    // Generate AI response with conversation context
    const assistantResponse = await openAIService.generateResponse(systemPrompt, userInput, chatHistory);
    const responseTime = Date.now() - startTime;

    // Get next message order for this session
    const nextMessageOrder = await dbService.getNextMessageOrder(sessionId);

    // Save conversation messages in background
    Promise.all([
      // Save user message
      dbService.saveConversationMessage(sessionId, 'user', userInput, nextMessageOrder),
      // Save assistant response
      dbService.saveConversationMessage(sessionId, 'assistant', assistantResponse, nextMessageOrder + 1),
      // Track knowledge usage
      dbService.updateKnowledgeUsage(relevantKnowledge.map(item => item.prompt_key)),
      // Save interaction
      dbService.saveInteraction(sessionId, userInput, assistantResponse, responseTime, relevantKnowledge.map(item => item.prompt_key)),
      // Update session
      dbService.updateSession(sessionId)
    ]).catch(error => console.error('Background tasks error:', error));

    console.log('Response generated in', responseTime, 'ms with GPT-4o-mini using conversation memory');

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      sessionId: sessionId,
      knowledgeUsed: relevantKnowledge.length,
      conversationLength: conversationHistory.length + 2, // +2 for current user and assistant messages
      model: 'gpt-4o-mini'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-gpt function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
