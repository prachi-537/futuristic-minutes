import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import FileUpload from '@/components/meeting/FileUpload';
import MeetingMinutesDisplay from '@/components/meeting/MeetingMinutesDisplay';

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [minutes, setMinutes] = useState<any>(null);
  const { toast } = useToast();

  const generateMinutes = async () => {
    if (!transcript.trim()) {
      toast({
        title: "Transcript Required",
        description: "Please provide a meeting transcript to generate minutes.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-minutes', {
        body: { transcript }
      });

      if (error) throw error;

      // Validate the response structure
      if (!data || !data.minutes_json || !data.minutes_html) {
        throw new Error('Invalid response format from AI service');
      }

      setMinutes(data);
      
      // Save to database
      await saveMeetingToDatabase(data);
      
      toast({
        title: "Notes Generated!",
        description: "Your meeting notes have been successfully generated and saved.",
      });
    } catch (error: any) {
      console.error('Error generating minutes:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate meeting notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveMeetingToDatabase = async (minutesData: any) => {
    try {
      const meetingData = {
        title: minutesData.minutes_json?.title || "Generated Meeting Notes",
        transcript: transcript,
        minutes_html: minutesData.minutes_html,
        minutes_json: minutesData.minutes_json,
        minutes_table: minutesData.minutes_table,
        participants: minutesData.minutes_json?.participants || [],
        date: minutesData.minutes_json?.date ? new Date(minutesData.minutes_json.date).toISOString() : new Date().toISOString(),
        owner_id: user.id
      };

      const { error } = await supabase
        .from('meetings')
        .insert(meetingData);

      if (error) throw error;
      
      console.log('Meeting saved to database successfully');
    } catch (error) {
      console.error('Error saving meeting to database:', error);
      // Don't show error to user since minutes were still generated
    }
  };

  const handleFileContent = (content: string, fileName: string) => {
    setTranscript(content);
    toast({
      title: "File Processed",
      description: `Successfully loaded content from ${fileName}`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold font-poppins bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
          ZapNote
        </h1>
        <p className="text-lg text-muted-foreground">
          your AI buddy that zaps long meetings into crisp action minutes
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
                {/* Input Section */}
        <div className="space-y-6">
                     <FileUpload onFileContent={handleFileContent} loading={loading} />
          
          <Card className="film-card p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold font-poppins">Meeting Transcript</h3>
              <Textarea
                placeholder="Paste your meeting transcript here..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="film-input min-h-[300px] resize-none"
              />
              <Button
                onClick={generateMinutes}
                disabled={loading || !transcript.trim()}
                className="w-full film-button-primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Minutes...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Notes
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          {minutes ? (
            <MeetingMinutesDisplay minutes={minutes} />
          ) : (
            <Card className="film-card p-6 film-vignette">
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold font-poppins mb-2">No Notes Generated Yet</h3>
                <p className="text-muted-foreground">
                  Upload a transcript or paste it manually to generate structured meeting notes
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}