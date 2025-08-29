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
    const { transcript } = await req.json();
    
    if (!transcript) {
      throw new Error('Transcript is required');
    }

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    console.log('Generating meeting minutes for transcript length:', transcript.length);

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
            content: `You are an expert meeting minutes generator. Transform the provided transcript into well-structured meeting minutes.

IMPORTANT: Return your response as a JSON object with this exact structure:
{
  "minutes_html": "HTML formatted minutes with proper headings, lists, and formatting",
  "minutes_json": {
    "title": "Meeting Title",
    "date": "YYYY-MM-DD",
    "participants": ["Name 1", "Name 2"],
    "agenda_items": [
      {
        "topic": "Topic name",
        "discussion": "Summary of discussion",
        "decisions": ["Decision 1", "Decision 2"],
        "action_items": [
          {
            "task": "Task description",
            "assignee": "Person responsible",
            "deadline": "Due date if mentioned"
          }
        ]
      }
    ],
    "next_meeting": "Next meeting info if mentioned"
  },
  "minutes_table": [
    {
      "time": "timestamp or section",
      "speaker": "Speaker name",
      "topic": "Discussion topic",
      "key_points": ["Point 1", "Point 2"],
      "decisions": ["Decision if any"],
      "actions": ["Action items if any"]
    }
  ]
}

Format the HTML with proper headings (h2, h3), bullet points, and emphasis. Make it clean and professional.`
          },
          {
            role: 'user',
            content: `Please generate comprehensive meeting minutes from this transcript:\n\n${transcript}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
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

    const generatedContent = data.choices[0].message.content;
    console.log('Generated content length:', generatedContent.length);

    // Try to parse as JSON first
    let result;
    try {
      result = JSON.parse(generatedContent);
    } catch (parseError) {
      console.log('Content is not JSON, creating structured response');
      // If not JSON, create a structured response
      result = {
        minutes_html: `<div class="meeting-minutes">
          <h2>Meeting Minutes</h2>
          <div class="content">${generatedContent.replace(/\n/g, '<br>')}</div>
        </div>`,
        minutes_json: {
          title: "Generated Meeting Minutes",
          date: new Date().toISOString().split('T')[0],
          participants: [],
          agenda_items: [
            {
              topic: "Meeting Discussion",
              discussion: generatedContent.substring(0, 500) + "...",
              decisions: [],
              action_items: []
            }
          ]
        },
        minutes_table: [
          {
            time: "Full Meeting",
            speaker: "Various",
            topic: "Meeting Discussion",
            key_points: [generatedContent.substring(0, 200) + "..."],
            decisions: [],
            actions: []
          }
        ]
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-minutes function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate meeting minutes'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});