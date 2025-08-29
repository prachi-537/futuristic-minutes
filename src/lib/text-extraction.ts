import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface TextExtractionResult {
  text: string;
  success: boolean;
  error?: string;
  pageCount?: number;
}

/**
 * Extract text from TXT files using FileReader
 * @param file - The text file to extract content from
 * @returns Promise<TextExtractionResult> - The extracted text and metadata
 */
export async function extractTextFromTXT(file: File): Promise<TextExtractionResult> {
  try {
    // Use FileReader to read the text file with UTF-8 encoding
    const text = await file.text();
    
    return {
      text: text.trim(),
      success: true
    };
  } catch (error) {
    console.error('TXT extraction error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read text file'
    };
  }
}

/**
 * Extract text from PDF files using PDF.js
 * @param file - The PDF file to extract content from
 * @returns Promise<TextExtractionResult> - The extracted text and metadata
 */
export async function extractTextFromPDF(file: File): Promise<TextExtractionResult> {
  try {
    // Convert file to ArrayBuffer for PDF.js
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Concatenate text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    // Clean up the extracted text
    const cleanedText = fullText
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n') // Remove excessive line breaks
      .trim();
    
    return {
      text: cleanedText,
      success: true,
      pageCount
    };
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract text from PDF'
    };
  }
}

/**
 * Extract text from DOCX files using mammoth.js
 * @param file - The DOCX file to extract content from
 * @returns Promise<TextExtractionResult> - The extracted text and metadata
 */
export async function extractTextFromDOCX(file: File): Promise<TextExtractionResult> {
  try {
    // Convert file to ArrayBuffer for mammoth.js
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract text using mammoth.js
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    return {
      text: result.value.trim(),
      success: true
    };
    
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract text from DOCX'
    };
  }
}

/**
 * Main function to extract text from any supported file type
 * @param file - The file to extract text from
 * @returns Promise<TextExtractionResult> - The extracted text and metadata
 */
export async function extractTextFromFile(file: File): Promise<TextExtractionResult> {
  // Determine file type and call appropriate extraction function
  if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
    return await extractTextFromTXT(file);
  } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return await extractTextFromPDF(file);
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
             file.name.toLowerCase().endsWith('.docx')) {
    return await extractTextFromDOCX(file);
  } else {
    return {
      text: '',
      success: false,
      error: 'Unsupported file type. Please upload a TXT, PDF, or DOCX file.'
    };
  }
}

/**
 * Validate that the extracted text is meaningful
 * @param text - The extracted text to validate
 * @returns boolean - True if the text contains meaningful content
 */
export function isValidExtractedText(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  
  // Check if text contains mostly readable characters
  const readableChars = text.replace(/[^a-zA-Z0-9\s.,!?;:'"()-]/g, '').length;
  const totalChars = text.length;
  
  // At least 70% should be readable characters
  return (readableChars / totalChars) > 0.7 && text.length > 10;
}
