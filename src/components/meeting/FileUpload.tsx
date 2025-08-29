import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, Loader2, File, FileImage } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { extractTextFromFile, isValidExtractedText } from '@/lib/text-extraction';

interface FileUploadProps {
  onFileContent: (content: string, fileName: string) => void;
  loading: boolean;
}

export default function FileUpload({ onFileContent, loading }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Add accepted files to the list
    setFiles(prev => [...prev, ...acceptedFiles]);
    
    // Show error messages for rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach((error: any) => {
        toast({
          title: "File Upload Failed",
          description: error.message || "Failed to upload file",
          variant: "destructive",
        });
      });
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    validator: (file) => {
      // Additional validation for supported file types
      const isSupported = file.type === 'text/plain' || 
                         file.type === 'application/pdf' || 
                         file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                         file.name.toLowerCase().endsWith('.txt') ||
                         file.name.toLowerCase().endsWith('.pdf') ||
                         file.name.toLowerCase().endsWith('.docx');
      
      if (!isSupported) {
        return {
          code: 'file-invalid-type',
          message: 'Please upload a TXT, PDF, or DOCX file'
        };
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit for large files
        return {
          code: 'file-too-large',
          message: 'File must be smaller than 50MB'
        };
      }
      
      return null;
    }
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Helper function to get the appropriate icon for each file type
  const getFileIcon = (file: File) => {
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      return <FileText className="w-4 h-4 text-primary" />;
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return <FileImage className="w-4 h-4 text-red-500" />;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               file.name.toLowerCase().endsWith('.docx')) {
      return <File className="w-4 h-4 text-blue-500" />;
    }
    return <FileText className="w-4 h-4 text-primary" />;
  };

  const processFile = async (file: File) => {
    setProcessing(true);
    
    try {
      // Extract text from the uploaded file using our utility functions
      const result = await extractTextFromFile(file);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to extract text from file');
      }
      
      // Validate that the extracted text is meaningful
      if (!isValidExtractedText(result.text)) {
        throw new Error('Extracted text appears to be corrupted or contains mostly non-readable characters');
      }
      
      // Pass the extracted text to the parent component
      onFileContent(result.text, file.name);
      
      // Show success message with file-specific details
      let description = `Successfully extracted text from ${file.name}`;
      if (result.pageCount) {
        description += ` (${result.pageCount} page${result.pageCount > 1 ? 's' : ''})`;
      }
      
      toast({
        title: "File Processed Successfully!",
        description: description,
      });
      
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "File Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessFiles = async () => {
    if (files.length === 0) return;
    
    // Process the first file for now
    await processFile(files[0]);
    setFiles([]);
  };

  return (
    <Card className="film-card p-6">
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold font-poppins mb-2">Upload Meeting Transcript</h3>
          <p className="text-sm text-muted-foreground">
            Upload a text file, PDF, or DOCX document containing your meeting transcript
          </p>
        </div>

        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            ${loading || processing ? 'pointer-events-none opacity-50' : ''}
            hover:scale-105 active:scale-95
          `}
        >
          <input {...getInputProps()} />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          
          {isDragActive ? (
            <p className="text-primary font-medium">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-foreground font-medium mb-2">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                Supports: TXT, PDF, DOCX (up to 10MB)
              </p>
            </div>
          )}
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Files:</h4>
            {files.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                                 <div className="flex items-center space-x-3">
                   {getFileIcon(file)}
                   <div>
                     <p className="text-sm font-medium">{file.name}</p>
                     <p className="text-xs text-muted-foreground">
                       {(file.size / 1024 / 1024).toFixed(2)} MB
                     </p>
                   </div>
                 </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="text-muted-foreground hover:text-destructive"
                  disabled={processing}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Process Button */}
        {files.length > 0 && (
          <Button
            onClick={handleProcessFiles}
            className="w-full film-button-primary"
            disabled={processing || loading}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing File...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Process Transcript
              </>
            )}
          </Button>
        )}


      </div>
    </Card>
  );
}