
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KnowledgeItem {
  category: string;
  prompt_key: string;
  prompt_text: string;
  response_template: string;
  usage_count: number;
}

async function findRelevantKnowledge(userInput: string): Promise<KnowledgeItem[]> {
  try {
    const { data: knowledge, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error fetching knowledge:', error);
      return [];
    }

    // Simple keyword matching for relevant knowledge
    const relevantKnowledge = knowledge?.filter((item: KnowledgeItem) => {
      const keywords = item.prompt_text.toLowerCase().split(' ');
      const inputLower = userInput.toLowerCase();
      return keywords.some(keyword => inputLower.includes(keyword));
    }) || [];

    return relevantKnowledge.slice(0, 3); // Limit to top 3 relevant items
  } catch (error) {
    console.error('Error in findRelevantKnowledge:', error);
    return [];
  }
}

async function updateKnowledgeUsage(promptKeys: string[]) {
  if (promptKeys.length === 0) return;
  
  try {
    await supabase.rpc('update_knowledge_usage', { prompt_keys: promptKeys });
  } catch (error) {
    console.error('Error updating knowledge usage:', error);
  }
}

async function saveInteraction(sessionId: string, userInput: string, aiResponse: string, responseTimeMs: number, knowledgeUsed: string[]) {
  try {
    await supabase
      .from('user_interactions')
      .insert({
        session_id: sessionId,
        user_input: userInput,
        ai_response: aiResponse,
        response_time_ms: responseTimeMs,
        knowledge_used: knowledgeUsed
      });
  } catch (error) {
    console.error('Error saving interaction:', error);
  }
}

async function updateSession(sessionId: string) {
  try {
    // Check if session exists
    const { data: existingSession } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (existingSession) {
      // Update existing session
      await supabase
        .from('chat_sessions')
        .update({
          interaction_count: existingSession.interaction_count + 1,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId);
    } else {
      // Create new session
      await supabase
        .from('chat_sessions')
        .insert({
          session_id: sessionId,
          interaction_count: 1
        });
    }
  } catch (error) {
    console.error('Error updating session:', error);
  }
}

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

    // Find relevant knowledge
    const relevantKnowledge = await findRelevantKnowledge(userInput);
    console.log('Found relevant knowledge:', relevantKnowledge.length, 'items');

    // Build enhanced system prompt with knowledge
    let systemPrompt = `You are Elena, a sophisticated and professional hospitality assistant for a luxury hotel. You have an elegant, warm, and refined speaking style that reflects exceptional service standards.

Key personality traits:
- Speak with the grace and professionalism of a luxury hotel concierge
- Use refined language while remaining approachable and friendly
- Show genuine care and attention to detail in every response
- Maintain a confident yet humble demeanor

You can help guests with:
- Room service orders and dining recommendations
- Hotel amenities and services information
- Local attractions and recommendations
- Concierge services
- Housekeeping requests
- Check-in/check-out assistance
- Spa and wellness bookings
- Transportation arrangements

Always speak as if you're a knowledgeable, experienced hospitality professional who takes pride in providing exceptional service.`;

    if (relevantKnowledge.length > 0) {
      systemPrompt += '\n\nRelevant hotel knowledge for this conversation:\n';
      relevantKnowledge.forEach(item => {
        systemPrompt += `- ${item.category}: ${item.response_template}\n`;
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
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
    const responseTime = Date.now() - startTime;

    // Track knowledge usage
    const usedPromptKeys = relevantKnowledge.map(item => item.prompt_key);
    
    // Save interaction and update session in background
    Promise.all([
      saveInteraction(sessionId, userInput, assistantResponse, responseTime, usedPromptKeys),
      updateKnowledgeUsage(usedPromptKeys),
      updateSession(sessionId)
    ]).catch(error => console.error('Background tasks error:', error));

    console.log('Response generated in', responseTime, 'ms');

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      sessionId: sessionId,
      knowledgeUsed: usedPromptKeys.length
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
