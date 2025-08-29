import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, context } = await req.json();
    
    if (!question) {
      throw new Error('Question is required');
    }

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    console.log('Processing Q&A for question:', question.substring(0, 100));

    const contextPrompt = context ? 
      `Context (Meeting Minutes and Transcript):\n${context}\n\n` : 
      '';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tkepzmiejtvauvxxkgru.supabase.co',
        'X-Title': 'Meeting Minutes Generator'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that helps users understand meeting minutes and transcripts. Answer questions based on the provided context. If the answer isn't in the context, say so clearly.

Be concise but thorough. Focus on:
- Action items and who they're assigned to
- Key decisions made
- Important discussions and outcomes
- Dates and deadlines mentioned
- Participants and their contributions

Format your response with clear structure using bullet points or numbered lists when appropriate.`
          },
          {
            role: 'user',
            content: `${contextPrompt}Question: ${question}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected API response structure:', data);
      throw new Error('Invalid response from OpenRouter API');
    }

    const answer = data.choices[0].message.content;
    console.log('Generated answer length:', answer.length);

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-qa function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to process question'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});