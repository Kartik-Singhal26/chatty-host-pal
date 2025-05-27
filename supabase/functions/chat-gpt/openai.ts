
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OpenAIService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(systemPrompt: string, userInput: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    try {
      // Build messages array with conversation history
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Add conversation history (excluding system messages to avoid duplication)
      conversationHistory.forEach(msg => {
        if (msg.role !== 'system') {
          messages.push(msg);
        }
      });

      // Add current user input
      messages.push({ role: 'user', content: userInput });

      console.log('Sending request to GPT-4o-mini with', messages.length, 'messages');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response generated from OpenAI');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }
}
