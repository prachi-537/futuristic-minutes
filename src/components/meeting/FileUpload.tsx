import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileContent: (content: string, fileName: string) => void;
  loading: boolean;
}

export default function FileUpload({ onFileContent, loading }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFile = async (file: File) => {
    setProcessing(true);
    
    try {
      if (file.type === 'text/plain') {
        // Handle text files
        const content = await file.text();
        onFileContent(content, file.name);
      } else if (file.type === 'application/pdf') {
        // For PDF files, we'd need a PDF parsing library
        // For now, we'll show an upload message
        toast({
          title: "PDF Processing",
          description: "PDF processing is not yet implemented. Please use text files for now.",
          variant: "destructive",
        });
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For DOCX files, we'd need a DOCX parsing library  
        toast({
          title: "DOCX Processing",
          description: "DOCX processing is not yet implemented. Please use text files for now.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "File Processing Error",
        description: "Failed to process the file. Please try again.",
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
                  <FileText className="w-4 h-4 text-primary" />
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

        {/* Manual Input Option */}
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or paste transcript manually
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}