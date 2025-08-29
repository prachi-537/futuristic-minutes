import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Copy, 
  Calendar, 
  Users, 
  CheckCircle, 
  Clock,
  User,
  Target,
  CalendarDays
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ActionItem {
  task: string;
  assignee: string;
  deadline?: string;
}

interface AgendaItem {
  topic: string;
  discussion: string;
  decisions: string[];
  action_items: ActionItem[];
}

interface MinutesData {
  minutes_html: string;
  minutes_json: {
    title: string;
    date: string;
    participants: string[];
    agenda_items: AgendaItem[];
    next_meeting?: string;
  };
  minutes_table: Array<{
    time: string;
    speaker: string;
    topic: string;
    key_points: string[];
    decisions: string[];
    actions: string[];
  }>;
}

interface MeetingMinutesDisplayProps {
  minutes: MinutesData;
  onExport?: () => void;
}

export default function MeetingMinutesDisplay({ minutes, onExport }: MeetingMinutesDisplayProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const exportAsText = () => {
    const textContent = `
${minutes.minutes_json.title}
Date: ${formatDate(minutes.minutes_json.date)}
Participants: ${minutes.minutes_json.participants.join(', ')}

${minutes.minutes_json.agenda_items.map(item => `
Topic: ${item.topic}
Discussion: ${item.discussion}
Decisions: ${item.decisions.join(', ')}
Action Items: ${item.action_items.map(action => `${action.task} (${action.assignee})`).join(', ')}
`).join('\n')}

${minutes.minutes_json.next_meeting ? `Next Meeting: ${minutes.minutes_json.next_meeting}` : ''}
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zapnote-${minutes.minutes_json.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="film-card p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold font-poppins bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {minutes.minutes_json.title}
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(minutes.minutes_json.date)}
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {minutes.minutes_json.participants.length} participants
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={exportAsText}
              className="film-button"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(JSON.stringify(minutes.minutes_json, null, 2))}
              className="film-button"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy JSON
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary" className="film-tab">Summary</TabsTrigger>
            <TabsTrigger value="detailed" className="film-tab">Detailed</TabsTrigger>
            <TabsTrigger value="timeline" className="film-tab">Timeline</TabsTrigger>
            <TabsTrigger value="actions" className="film-tab">Actions</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Participants */}
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Participants
                </h4>
                <div className="flex flex-wrap gap-2">
                  {minutes.minutes_json.participants.map((participant, index) => (
                    <Badge key={index} variant="secondary" className="film-badge">
                      <User className="w-3 h-3 mr-1" />
                      {participant}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Agenda Items Summary */}
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Meeting Topics
                </h4>
                <div className="space-y-4">
                  {minutes.minutes_json.agenda_items.map((item, index) => (
                    <Card key={index} className="p-4 bg-muted/20 border-l-4 border-l-primary">
                      <h5 className="font-semibold text-primary mb-2">{item.topic}</h5>
                      <p className="text-sm text-muted-foreground mb-3">{item.discussion}</p>
                      
                      {item.decisions.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Decisions
                          </h6>
                          <ul className="space-y-1">
                            {item.decisions.map((decision, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                                {decision}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.action_items.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            Action Items
                          </h6>
                          <div className="space-y-2">
                            {item.action_items.map((action, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-background/50 p-2 rounded">
                                <span>{action.task}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {action.assignee}
                                  </Badge>
                                  {action.deadline && (
                                    <Badge variant="secondary" className="text-xs">
                                      <CalendarDays className="w-3 h-3 mr-1" />
                                      {action.deadline}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>

              {/* Next Meeting */}
              {minutes.minutes_json.next_meeting && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Next Meeting
                  </h4>
                  <p className="text-muted-foreground">{minutes.minutes_json.next_meeting}</p>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Detailed Tab */}
          <TabsContent value="detailed" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: minutes.minutes_html }}
            />
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {minutes.minutes_table.map((entry, index) => (
                <Card key={index} className="p-4 bg-muted/20">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Badge variant="outline" className="font-mono">
                        {entry.time}
                      </Badge>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <span className="font-medium">{entry.speaker}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-primary font-medium">{entry.topic}</span>
                      </div>
                      
                      {entry.key_points.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium mb-1">Key Points:</h6>
                          <ul className="space-y-1">
                            {entry.key_points.map((point, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {entry.decisions.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium mb-1 text-green-500">Decisions:</h6>
                          <ul className="space-y-1">
                            {entry.decisions.map((decision, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                                {decision}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {entry.actions.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium mb-1 text-blue-500">Actions:</h6>
                          <ul className="space-y-1">
                            {entry.actions.map((action, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <Clock className="w-3 h-3 text-blue-500 mt-0.5" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </motion.div>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Action Items Summary</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const actionsText = minutes.minutes_json.agenda_items
                      .flatMap(item => item.action_items)
                      .map(action => `${action.task} - ${action.assignee}${action.deadline ? ` (${action.deadline})` : ''}`)
                      .join('\n');
                    copyToClipboard(actionsText);
                  }}
                  className="film-button"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Actions
                </Button>
              </div>

              <div className="space-y-3">
                {minutes.minutes_json.agenda_items
                  .flatMap(item => item.action_items)
                  .map((action, index) => (
                    <Card key={index} className="p-4 bg-muted/20 border-l-4 border-l-blue-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium mb-2">{action.task}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {action.assignee}
                            </span>
                            {action.deadline && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-4 h-4" />
                                {action.deadline}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          Action Required
                        </Badge>
                      </div>
                    </Card>
                  ))}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
