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
    const { fileData, fileName } = await req.json();
    
    if (!fileData || !Array.isArray(fileData)) {
      throw new Error('Invalid file data provided');
    }

    console.log(`Processing DOCX file: ${fileName}, size: ${fileData.length} bytes`);

    // Convert array back to Uint8Array
    const uint8Array = new Uint8Array(fileData);
    
    // Basic DOCX text extraction
    let extractedText = '';
    
    try {
      // DOCX files are essentially ZIP archives containing XML files
      // For basic text extraction, we'll look for readable content
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const content = decoder.decode(uint8Array);
      
      // Look for XML text content patterns typical in DOCX files
      // This is a simplified approach - for production use a proper DOCX parser
      
      // Extract text between XML tags
      const textMatches = content.match(/>([^<>]{3,})</g) || [];
      const words = [];
      
      for (const match of textMatches) {
        const text = match.replace(/[><]/g, '').trim();
        // Filter out XML artifacts and keep meaningful text
        if (text.length > 2 && 
            !text.match(/^[0-9.]+$/) && 
            !text.includes('<?xml') &&
            !text.includes('xmlns') &&
            !text.includes('http://') &&
            !text.includes('urn:') &&
            text.match(/[a-zA-Z]/)) {
          words.push(text);
        }
      }
      
      extractedText = words.join(' ').replace(/\s+/g, ' ').trim();

      // If no meaningful text found, try alternative extraction
      if (!extractedText || extractedText.length < 10) {
        // Look for any readable ASCII text in the file
        const readableMatches = content.match(/[a-zA-Z][a-zA-Z\s.,!?;:'"()-]{5,}/g);
        if (readableMatches) {
          extractedText = readableMatches
            .filter(text => text.trim().length > 5)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }

      // Final check
      if (!extractedText || extractedText.length < 10) {
        extractedText = `Unable to extract readable text from ${fileName}. This DOCX file might be corrupted, password-protected, or contain mainly images. Please try saving it as a plain text file.`;
      }

    } catch (parseError) {
      console.error('DOCX parsing error:', parseError);
      extractedText = `Error parsing DOCX: ${fileName}. Please ensure the file is a valid DOCX document.`;
    }

    console.log(`Extracted text length: ${extractedText.length} characters`);

    return new Response(JSON.stringify({ 
      text: extractedText.trim(),
      fileName: fileName,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-docx function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to parse DOCX file',
        success: false
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
