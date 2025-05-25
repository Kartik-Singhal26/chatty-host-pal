
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const openAIConfig = {
  model: 'gpt-4o-mini',
  temperature: 0.2,
  maxTokens: 250,
};

export const getEnvironmentVariables = () => {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return {
    openAIApiKey,
    supabaseUrl,
    supabaseServiceKey,
  };
};
