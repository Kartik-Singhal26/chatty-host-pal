
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

function calculateOptimalDiscount(hotelItem: HotelInformation, requestedDiscountPercent?: number): {
  originalPrice: number;
  discountedPrice: number;
  maxDiscountPercent: number;
  canOfferDiscount: boolean;
  profitMargin: number;
} {
  const basePrice = hotelItem.base_price;
  const maxDiscountPercent = hotelItem.negotiation_margin_percent;
  const finalLimit = hotelItem.final_negotiation_limit;
  
  // Calculate minimum selling price for profit
  const minSellingPrice = basePrice - (basePrice * maxDiscountPercent / 100);
  
  let discountPercent = 0;
  let canOfferDiscount = false;
  
  if (requestedDiscountPercent && requestedDiscountPercent <= maxDiscountPercent) {
    discountPercent = requestedDiscountPercent;
    canOfferDiscount = true;
  } else if (maxDiscountPercent > 0) {
    // Offer a conservative discount (80% of max margin)
    discountPercent = Math.min(maxDiscountPercent * 0.8, 15); // Cap at 15%
    canOfferDiscount = true;
  }
  
  const discountedPrice = basePrice - (basePrice * discountPercent / 100);
  const profitMargin = ((discountedPrice - finalLimit) / discountedPrice) * 100;
  
  return {
    originalPrice: basePrice,
    discountedPrice,
    maxDiscountPercent: discountPercent,
    canOfferDiscount,
    profitMargin
  };
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

    // Get hotel pricing data for strict price adherence
    const hotelData = await getHotelPricingData();
    console.log('Loaded hotel data:', hotelData.length, 'items');

    // Find relevant knowledge
    const relevantKnowledge = await findRelevantKnowledge(userInput);
    console.log('Found relevant knowledge:', relevantKnowledge.length, 'items');

    // Build enhanced system prompt with STRICT pricing guidelines
    let systemPrompt = `You are Elena, a sophisticated and professional hospitality assistant for a luxury hotel. You have an elegant, warm, and refined speaking style that reflects exceptional service standards.

CRITICAL PRICING RULES - MUST BE FOLLOWED EXACTLY:
1. NEVER deviate from the exact prices listed in the hotel database
2. You can ONLY offer discounts within the specified margin limits for each item
3. Always quote prices in Indian Rupees (₹) with proper formatting
4. When calculating discounts, ensure the final price never goes below the final_negotiation_limit
5. Always aim to maximize profit while securing the booking
6. If a customer requests a discount beyond the allowed margin, politely explain our pricing structure

DISCOUNT CALCULATION RULES:
- Base Price: The standard rate (never go above this without justification)
- Maximum Discount: Limited by negotiation_margin_percent in database
- Final Negotiation Limit: Absolute minimum price (never go below this)
- Always show: Original Price → Discounted Price (if applicable)

Key personality traits:
- Speak with the grace and professionalism of a luxury hotel concierge
- Use refined language while remaining approachable and friendly
- Show genuine care and attention to detail in every response
- Maintain a confident yet humble demeanor
- Keep responses concise and to the point - avoid overly long explanations
- Always justify pricing decisions with value propositions

You can help guests with:
- Room service orders and dining recommendations with exact pricing
- Hotel amenities and services information with accurate costs
- Local attractions and recommendations
- Concierge services with competitive but profitable pricing
- Housekeeping requests with proper rates
- Check-in/check-out assistance
- Spa and wellness bookings with database-accurate pricing
- Transportation arrangements with correct fare calculations

MANDATORY: When discussing any service with pricing, you MUST reference the database prices exactly and only offer discounts within the allowed margins.`;

    if (relevantKnowledge.length > 0) {
      systemPrompt += '\n\nRelevant hotel knowledge for this conversation:\n';
      relevantKnowledge.forEach(item => {
        systemPrompt += `- ${item.category}: ${item.response_template}\n`;
      });
    }

    // Add STRICT pricing context when pricing is mentioned
    if (hotelData.length > 0 && (userInput.toLowerCase().includes('discount') || userInput.toLowerCase().includes('price') || userInput.toLowerCase().includes('cost') || userInput.toLowerCase().includes('rate') || userInput.toLowerCase().includes('charge') || userInput.toLowerCase().includes('डिस्काउंट') || userInput.toLowerCase().includes('कीमत'))) {
      systemPrompt += '\n\nHOTEL PRICING DATABASE (ALL PRICES ARE FINAL - FOLLOW EXACTLY):\n';
      
      hotelData.forEach(item => {
        const maxDiscountAmount = (item.base_price * item.negotiation_margin_percent) / 100;
        const minSellingPrice = item.base_price - maxDiscountAmount;
        
        systemPrompt += `\n${item.category} - ${item.item_name}:
- Base Price: ₹${item.base_price.toLocaleString('en-IN')} (STANDARD RATE)
- Maximum Discount Allowed: ${item.negotiation_margin_percent}% (₹${maxDiscountAmount.toLocaleString('en-IN')})
- Minimum Selling Price: ₹${minSellingPrice.toLocaleString('en-IN')}
- Final Negotiation Limit: ₹${item.final_negotiation_limit.toLocaleString('en-IN')} (NEVER GO BELOW)
- Description: ${item.description}
`;
      });
      
      systemPrompt += '\n\nPRICING GUIDELINES (MANDATORY):
1. Quote Base Price first, then mention available discounts if asked
2. Calculate discounts ONLY within the allowed margin
3. Never quote below the Final Negotiation Limit
4. Show calculations: "Base Price ₹X, with Y% discount = ₹Z"
5. Emphasize value and quality to justify pricing
6. If customer requests higher discount, explain margin limitations professionally
7. Always aim for maximum profit while securing the booking
8. Use phrases like "Our best available rate" or "Special discounted price of"
';
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
        temperature: 0.3, // Lower temperature for more consistent pricing
        max_tokens: 300, // Increased slightly for detailed pricing explanations
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
