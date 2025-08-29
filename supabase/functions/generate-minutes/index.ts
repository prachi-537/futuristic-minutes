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
        'X-Title': 'ZapNote'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert meeting notes generator with extensive experience in business communication and documentation. Transform the provided transcript into well-structured, professional meeting notes.

IMPORTANT INSTRUCTIONS:
1. Always respond in clear, professional English
2. Use proper business terminology and formatting
3. Identify key participants, decisions, and action items clearly
4. Structure the content logically and chronologically
5. Return your response as a JSON object with this exact structure:

{
  "minutes_html": "HTML formatted notes with proper headings (h2, h3), bullet points, and professional formatting. Use <h2> for main sections, <h3> for subsections, <ul> and <li> for lists, <strong> for emphasis, and <p> for paragraphs. Make it clean, professional, and easy to read.",
  "minutes_json": {
    "title": "Professional meeting title based on content",
    "date": "YYYY-MM-DD format (use current date if not specified)",
    "participants": ["Full names of all participants mentioned"],
    "agenda_items": [
      {
        "topic": "Clear topic name",
        "discussion": "Concise summary of discussion points in professional English",
        "decisions": ["Specific decisions made, clearly stated"],
        "action_items": [
          {
            "task": "Clear, actionable task description",
            "assignee": "Full name of person responsible",
            "deadline": "Due date if mentioned, or 'TBD' if not specified"
          }
        ]
      }
    ],
    "next_meeting": "Next meeting details if mentioned, or null if not specified"
  },
  "minutes_table": [
    {
      "time": "Time marker or section identifier",
      "speaker": "Speaker name",
      "topic": "Discussion topic",
      "key_points": ["Key points discussed, clearly stated"],
      "decisions": ["Decisions made, if any"],
      "actions": ["Action items identified, if any"]
    }
  ]
}

QUALITY REQUIREMENTS:
- Ensure all text is in proper English with correct grammar and spelling
- Use professional business language appropriate for meeting minutes
- Make action items specific and actionable
- Provide clear, concise summaries
- Maintain professional tone throughout
- Structure information logically and chronologically`
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
        minutes_html: `<div class="meeting-notes">
          <h2>Meeting Notes</h2>
          <div class="content">${generatedContent.replace(/\n/g, '<br>')}</div>
        </div>`,
        minutes_json: {
          title: "Generated Meeting Notes",
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