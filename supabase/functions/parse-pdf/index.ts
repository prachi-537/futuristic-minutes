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
    
    // Enhanced PDF text extraction with multiple fallback methods
    let extractedText = '';
    
    try {
      // Method 1: Try UTF-8 decoding first
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const fullText = decoder.decode(uint8Array);
      
      // Method 2: Look for PDF text objects (BT...ET)
      const textMatches = fullText.match(/BT\s*.*?ET/gs) || [];
      
      for (const match of textMatches) {
        // Extract text from PDF text objects
        const textContent = match.match(/\((.*?)\)/g);
        if (textContent) {
          for (const text of textContent) {
            const cleanText = text.replace(/[()]/g, '').trim();
            if (cleanText.length > 0 && /[a-zA-Z]/.test(cleanText)) {
              extractedText += cleanText + ' ';
            }
          }
        }
      }

      // Method 3: Look for text streams
      if (!extractedText.trim()) {
        const streamMatches = fullText.match(/stream\s*([\s\S]*?)\s*endstream/gi) || [];
        for (const stream of streamMatches) {
          const textContent = stream.match(/\((.*?)\)/g);
          if (textContent) {
            for (const text of textContent) {
              const cleanText = text.replace(/[()]/g, '').trim();
              if (cleanText.length > 0 && /[a-zA-Z]/.test(cleanText)) {
                extractedText += cleanText + ' ';
              }
            }
          }
        }
      }

      // Method 4: Look for readable ASCII text patterns
      if (!extractedText.trim()) {
        const readableText = fullText.match(/[a-zA-Z\s.,!?;:'"()-]{15,}/g);
        if (readableText) {
          extractedText = readableText.join(' ').replace(/\s+/g, ' ').trim();
        }
      }

      // Method 5: Try to find text in specific PDF structures
      if (!extractedText.trim()) {
        // Look for text in PDF dictionaries
        const dictMatches = fullText.match(/<<\s*.*?>>/gs) || [];
        for (const dict of dictMatches) {
          const textContent = dict.match(/\((.*?)\)/g);
          if (textContent) {
            for (const text of textContent) {
              const cleanText = text.replace(/[()]/g, '').trim();
              if (cleanText.length > 0 && /[a-zA-Z]/.test(cleanText)) {
                extractedText += cleanText + ' ';
              }
            }
          }
        }
      }

      // Method 6: Look for text after specific PDF keywords
      if (!extractedText.trim()) {
        const keywords = ['/Text', '/Contents', '/Page', '/Font'];
        for (const keyword of keywords) {
          const matches = fullText.match(new RegExp(`${keyword}\\s*\\(([^)]+)\\)`, 'gi')) || [];
          for (const match of matches) {
            const textContent = match.match(/\((.*?)\)/);
            if (textContent && textContent[1]) {
              const cleanText = textContent[1].trim();
              if (cleanText.length > 0 && /[a-zA-Z]/.test(cleanText)) {
                extractedText += cleanText + ' ';
              }
            }
          }
        }
      }

      // Clean up extracted text
      if (extractedText.trim()) {
        // Remove excessive whitespace and normalize
        extractedText = extractedText
          .replace(/\s+/g, ' ')
          .replace(/[^\x20-\x7E]/g, ' ') // Remove non-printable characters
          .replace(/\s+/g, ' ')
          .trim();
        
        // Ensure we have meaningful content
        if (extractedText.length < 50) {
          extractedText = '';
        }
      }

      // Final fallback - if still no text, provide helpful message
      if (!extractedText.trim()) {
        extractedText = `Unable to extract readable text from "${fileName}". This PDF might be:
        
1. Image-based (scanned document) - Try using OCR software to convert to text
2. Encrypted or password-protected - Ensure the PDF is unlocked
3. Corrupted - Try opening in a PDF reader to verify it's valid
4. Contains only images - Convert to text format or use text-based PDFs

Please try uploading a text file (.txt) or a PDF with selectable text content.`;
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