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

    console.log(`Processing PDF file: ${fileName}, size: ${fileData.length} bytes`);

    // Convert array back to Uint8Array
    const uint8Array = new Uint8Array(fileData);
    
    // Simple text extraction for PDF (basic implementation)
    // For production, you might want to use a more sophisticated PDF parser
    let extractedText = '';
    
    try {
      // Convert to string and look for readable text patterns
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const fullText = decoder.decode(uint8Array);
      
      // Basic PDF text extraction - look for text between stream objects
      const textMatches = fullText.match(/BT\s*.*?ET/gs) || [];
      
      for (const match of textMatches) {
        // Extract text from PDF text objects
        const textContent = match.match(/\((.*?)\)/g);
        if (textContent) {
          for (const text of textContent) {
            const cleanText = text.replace(/[()]/g, '').trim();
            if (cleanText.length > 0) {
              extractedText += cleanText + ' ';
            }
          }
        }
      }

      // If no text found with basic extraction, try a different approach
      if (!extractedText.trim()) {
        // Look for readable ASCII text in the PDF
        const readableText = fullText.match(/[a-zA-Z\s.,!?;:'"()-]{10,}/g);
        if (readableText) {
          extractedText = readableText.join(' ').replace(/\s+/g, ' ').trim();
        }
      }

      // Final fallback - if still no text, inform user
      if (!extractedText.trim()) {
        extractedText = `Unable to extract readable text from ${fileName}. This PDF might be image-based or encrypted. Please try converting it to a text file or ensure it contains selectable text.`;
      }

    } catch (parseError) {
      console.error('PDF parsing error:', parseError);
      extractedText = `Error parsing PDF: ${fileName}. Please ensure the file is a valid PDF with extractable text.`;
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
    console.error('Error in parse-pdf function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to parse PDF file',
        success: false
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});