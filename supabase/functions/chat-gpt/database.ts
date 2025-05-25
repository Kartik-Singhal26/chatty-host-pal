import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

export interface KnowledgeItem {
  category: string;
  prompt_key: string;
  prompt_text: string;
  response_template: string;
  usage_count: number;
}

export interface HotelInformation {
  id: string;
  category: string;
  item_name: string;
  base_price: number;
  negotiation_margin_percent: number;
  final_negotiation_limit: number;
  description: string;
  is_active: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_order: number;
}

export class DatabaseService {
  private supabase;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async getConversationHistory(sessionId: string): Promise<ConversationMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_memory')
        .select('role, content, message_order')
        .eq('session_id', sessionId)
        .order('message_order', { ascending: true });

      if (error) {
        console.error('Error fetching conversation history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getConversationHistory:', error);
      return [];
    }
  }

  async saveConversationMessage(sessionId: string, role: string, content: string, messageOrder: number) {
    try {
      await this.supabase
        .from('conversation_memory')
        .insert({
          session_id: sessionId,
          role: role,
          content: content,
          message_order: messageOrder
        });
    } catch (error) {
      console.error('Error saving conversation message:', error);
    }
  }

  async getNextMessageOrder(sessionId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_memory')
        .select('message_order')
        .eq('session_id', sessionId)
        .order('message_order', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting last message order:', error);
        return 1;
      }

      return data && data.length > 0 ? data[0].message_order + 1 : 1;
    } catch (error) {
      console.error('Error in getNextMessageOrder:', error);
      return 1;
    }
  }

  async getHotelPricingData(): Promise<HotelInformation[]> {
    try {
      const { data: hotelData, error } = await this.supabase
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

  async findRelevantKnowledge(userInput: string): Promise<KnowledgeItem[]> {
    try {
      const { data: knowledge, error } = await this.supabase
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

  async updateKnowledgeUsage(promptKeys: string[]) {
    if (promptKeys.length === 0) return;
    
    try {
      await this.supabase.rpc('update_knowledge_usage', { prompt_keys: promptKeys });
    } catch (error) {
      console.error('Error updating knowledge usage:', error);
    }
  }

  async saveInteraction(sessionId: string, userInput: string, aiResponse: string, responseTimeMs: number, knowledgeUsed: string[]) {
    try {
      await this.supabase
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

  async updateSession(sessionId: string) {
    try {
      // Check if session exists
      const { data: existingSession } = await this.supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (existingSession) {
        // Update existing session
        await this.supabase
          .from('chat_sessions')
          .update({
            interaction_count: existingSession.interaction_count + 1,
            last_activity: new Date().toISOString()
          })
          .eq('session_id', sessionId);
      } else {
        // Create new session
        await this.supabase
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
}
