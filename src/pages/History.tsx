import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Clock, FileText, Download, Search, Filter, MoreVertical, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
  minutes_json: any;
  minutes_html: string;
  transcript: string;
  created_at: string;
  updated_at: string;
}

interface MemberActivity {
  name: string;
  meetings_count: number;
  last_active: string;
  contribution_score: number;
}

interface HistoryProps {
  user: any;
}

export default function History({ user }: HistoryProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [memberActivity, setMemberActivity] = useState<MemberActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMeetings();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateLong = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      
      const { data: meetingsData, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMeetings(meetingsData || []);
      calculateMemberActivity(meetingsData || []);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      toast({
        title: "Failed to load meetings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMemberActivity = (meetingsData: Meeting[]) => {
    const memberStats: Record<string, MemberActivity> = {};

    meetingsData.forEach(meeting => {
      if (meeting.participants && Array.isArray(meeting.participants)) {
        meeting.participants.forEach(participant => {
          if (!memberStats[participant]) {
            memberStats[participant] = {
              name: participant,
              meetings_count: 0,
              last_active: meeting.date || meeting.created_at,
              contribution_score: 0
            };
          }
          
          memberStats[participant].meetings_count += 1;
          
          // Update last active if this meeting is more recent
          const currentDate = new Date(meeting.date || meeting.created_at);
          const lastActiveDate = new Date(memberStats[participant].last_active);
          if (currentDate > lastActiveDate) {
            memberStats[participant].last_active = meeting.date || meeting.created_at;
          }

          // Calculate contribution score based on meeting frequency and recency
          const daysSinceLastActive = Math.floor((Date.now() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          const recencyScore = Math.max(0, 100 - daysSinceLastActive);
          memberStats[participant].contribution_score = 
            (memberStats[participant].meetings_count * 10) + (recencyScore * 0.5);
        });
      }
    });

    const sortedMembers = Object.values(memberStats)
      .sort((a, b) => b.contribution_score - a.contribution_score);

    setMemberActivity(sortedMembers);
  };

  const filteredMeetings = meetings.filter(meeting =>
    meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.participants?.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportMeeting = async (meeting: Meeting, format: 'pdf' | 'docx') => {
    try {
      if (format === 'pdf') {
        const { default: html2pdf } = await import('html2pdf.js');
        const element = document.createElement('div');
        element.innerHTML = meeting.minutes_html;
        
        const opt = {
          margin: 1,
          filename: `${meeting.title}-minutes.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(element).save();
      } else if (format === 'docx') {
        const { Document, Packer, Paragraph, TextRun } = await import('docx');
        
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: meeting.title,
                    bold: true,
                    size: 32,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Date: ${formatDateLong(meeting.date || meeting.created_at)}`,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Participants: ${meeting.participants?.join(', ') || 'N/A'}`,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: meeting.minutes_html.replace(/<[^>]*>/g, ''),
                    size: 24,
                  }),
                ],
              }),
            ],
          }],
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${meeting.title}-minutes.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Export successful",
        description: `Meeting minutes exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold font-poppins bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Meeting History
          </h1>
          <p className="text-muted-foreground">
            View and manage your past meeting minutes
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 film-input"
            />
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="film-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{meetings.length}</p>
                <p className="text-sm text-muted-foreground">Total Meetings</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="film-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{memberActivity.length}</p>
                <p className="text-sm text-muted-foreground">Active Members</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="film-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {memberActivity.length > 0 ? memberActivity[0]?.meetings_count || 0 : 0}
                </p>
                <p className="text-sm text-muted-foreground">Most Active</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Member Activity */}
      {memberActivity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="film-card p-6">
            <h3 className="text-lg font-semibold font-poppins mb-4">Most Active Members</h3>
            <div className="space-y-3">
              {memberActivity.slice(0, 5).map((member, index) => (
                <div key={member.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.meetings_count} meetings • Last active {formatDate(member.last_active)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={index < 3 ? "default" : "secondary"}>
                      #{index + 1}
                    </Badge>
                    <span className="text-sm font-medium">
                      {Math.round(member.contribution_score)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Meetings Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="film-card p-0 overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold font-poppins">Recent Meetings</h3>
          </div>
          
          {filteredMeetings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeetings.map((meeting) => (
                    <TableRow key={meeting.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div>
                          <p className="font-medium">{meeting.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {meeting.transcript ? `${meeting.transcript.substring(0, 100)}...` : 'No transcript'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatDate(meeting.date || meeting.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{meeting.participants?.length || 0} participants</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={meeting.minutes_html ? "default" : "secondary"}>
                          {meeting.minutes_html ? 'Processed' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedMeeting(meeting)}>
                              <FileText className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {meeting.minutes_html && (
                              <>
                                <DropdownMenuItem onClick={() => exportMeeting(meeting, 'pdf')}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Export as PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportMeeting(meeting, 'docx')}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Export as DOCX
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold font-poppins mb-2">No meetings found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms' : 'Start by creating your first meeting'}
              </p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Meeting Details Modal */}
      {selectedMeeting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedMeeting(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-poppins">{selectedMeeting.title}</h2>
                <Button variant="ghost" onClick={() => setSelectedMeeting(null)}>
                  ×
                </Button>
              </div>
              <p className="text-muted-foreground">
                {formatDateLong(selectedMeeting.date || selectedMeeting.created_at)}
              </p>
            </div>
            
            <div className="p-6">
              {selectedMeeting.minutes_html ? (
                <div 
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedMeeting.minutes_html }}
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No minutes generated for this meeting</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}