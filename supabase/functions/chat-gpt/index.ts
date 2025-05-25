
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

interface HotelInformation {
  id: string;
  category: string;
  item_name: string;
  base_price: number;
  negotiation_margin_percent: number;
  final_negotiation_limit: number;
  description: string;
  is_active: boolean;
}

async function getHotelPricingData(): Promise<HotelInformation[]> {
  try {
    const { data: hotelData, error } = await supabase
      .from('hotel_information')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching hotel data:', error);
      return [];
    }

    return hotelData || [];
  } catch (error) {
    console.error('Error in getHotelPricingData:', error);
    return [];
  }
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

    // Get hotel pricing data for STRICT price adherence
    const hotelData = await getHotelPricingData();
    console.log('Loaded hotel data:', hotelData.length, 'items');

    // Find relevant knowledge
    const relevantKnowledge = await findRelevantKnowledge(userInput);
    console.log('Found relevant knowledge:', relevantKnowledge.length, 'items');

    // Build enhanced system prompt with ABSOLUTE STRICT pricing guidelines
    let systemPrompt = `You are Elena, a sophisticated and professional hospitality assistant for a luxury hotel. You have an elegant, warm, and refined speaking style with a natural Indian accent that reflects exceptional service standards.

ABSOLUTE CRITICAL PRICING RULES - MUST BE FOLLOWED EXACTLY WITHOUT ANY EXCEPTION:
1. NEVER EVER deviate from the exact prices listed in the hotel database
2. You can ONLY offer discounts within the specified margin limits for each item - NO EXCEPTIONS
3. Always quote prices in Indian Rupees (₹) with proper formatting using commas
4. When calculating discounts, the final price MUST NEVER go below the final_negotiation_limit
5. Always aim to maximize profit while securing the booking
6. If a customer requests a discount beyond the allowed margin, you MUST clearly inform them that booking at that rate is NOT POSSIBLE and politely ask them to seek alternatives
7. Be specific and to the point - never contradict or repeat previous responses
8. Remember and reference all prior responses in the same conversation

STRICT DISCOUNT CALCULATION RULES (NO DEVIATION ALLOWED):
- Base Price: The standard rate (this is your starting point)
- Maximum Discount: Limited STRICTLY by negotiation_margin_percent in database
- Final Negotiation Limit: Absolute minimum price (NEVER EVER go below this)
- Always show calculation: "Base Price ₹X, with Y% discount = ₹Z"
- If customer wants more discount than allowed: "I apologize, but ₹X is our absolute minimum rate for this service. Booking below this rate is not possible."

PERSONALITY AND COMMUNICATION:
- Speak with natural Indian accent and moderately fast, clear speech
- Use refined language while remaining approachable and friendly
- Show genuine care and attention to detail
- Maintain confident yet humble demeanor
- Keep responses concise and specific
- Always justify pricing with value propositions
- Be consistent throughout the conversation

STRICT RESPONSE REQUIREMENTS:
- Always aim for maximum profit within allowed margins
- Use phrases like "Our best available rate" or "Special discounted price of"
- Never lose customers over small differences within allowed margin
- But NEVER compromise below final negotiation limits`;

    if (relevantKnowledge.length > 0) {
      systemPrompt += '\n\nRelevant hotel knowledge for this conversation:\n';
      relevantKnowledge.forEach(item => {
        systemPrompt += `- ${item.category}: ${item.response_template}\n`;
      });
    }

    // Add ABSOLUTE STRICT pricing context when pricing is mentioned
    if (hotelData.length > 0 && (userInput.toLowerCase().includes('discount') || userInput.toLowerCase().includes('price') || userInput.toLowerCase().includes('cost') || userInput.toLowerCase().includes('rate') || userInput.toLowerCase().includes('charge') || userInput.toLowerCase().includes('डिस्काउंट') || userInput.toLowerCase().includes('कीमत'))) {
      systemPrompt += '\n\nHOTEL PRICING DATABASE (THESE PRICES ARE ABSOLUTE - FOLLOW EXACTLY WITH NO DEVIATION):\n';
      
      hotelData.forEach(item => {
        const maxDiscountAmount = (item.base_price * item.negotiation_margin_percent) / 100;
        const minSellingPrice = item.base_price - maxDiscountAmount;
        
        systemPrompt += `\n${item.category} - ${item.item_name}:
- Base Price: ₹${item.base_price.toLocaleString('en-IN')} (STANDARD RATE - START HERE)
- Maximum Discount Allowed: ${item.negotiation_margin_percent}% (₹${maxDiscountAmount.toLocaleString('en-IN')})
- Minimum Selling Price: ₹${minSellingPrice.toLocaleString('en-IN')} (LOWEST YOU CAN GO)
- Final Negotiation Limit: ₹${item.final_negotiation_limit.toLocaleString('en-IN')} (ABSOLUTE FLOOR - NEVER GO BELOW)
- Description: ${item.description}
`;
      });
      
      systemPrompt += '\n\nABSOLUTE MANDATORY PRICING GUIDELINES (NO EXCEPTIONS):
1. Quote Base Price first, then mention available discounts if asked
2. Calculate discounts ONLY within the allowed margin - NO EXCEPTIONS
3. NEVER quote below the Final Negotiation Limit - this is ABSOLUTE
4. Show calculations clearly: "Base Price ₹X, with Y% discount = ₹Z"
5. Emphasize value and quality to justify pricing
6. If customer requests higher discount, firmly explain: "I apologize, but ₹X is our absolute minimum rate. Booking below this rate is not possible."
7. Always aim for maximum profit while securing booking within allowed margins
8. Use Indian Rupee formatting with commas: ₹1,50,000 not ₹150000
9. Be specific, consistent, and never contradict previous statements
10. Remember all previous responses in this conversation
';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using GPT-4o-mini as requested
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
        temperature: 0.2, // Lower temperature for more consistent and strict pricing adherence
        max_tokens: 250, // Concise responses as requested
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

    console.log('Response generated in', responseTime, 'ms with GPT-4o-mini');

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      sessionId: sessionId,
      knowledgeUsed: usedPromptKeys.length,
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
