import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';

export default function CoachMessageThread({ engagementId, coacheeEmail }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (engagementId) loadMessages();
  }, [engagementId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.CoachMessage.filter(
        { engagement_id: engagementId },
        'created_date'
      );
      setMessages(data);
    } catch (e) {
      console.error('Error loading messages:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await base44.functions.invoke('sendCoachMessage', {
        engagement_id: engagementId,
        body: newMessage.trim(),
      });
      setNewMessage('');
      loadMessages();
    } catch (e) {
      console.error('Error sending message:', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardContent className="py-4 px-5">
        <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No messages yet. Send a note to {coacheeEmail}.
            </p>
          ) : (
            messages.map(m => {
              const isCoach = m.sender_email === user?.email;
              return (
                <div key={m.id} className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isCoach
                      ? 'bg-[#0202ff] text-white'
                      : 'bg-muted text-foreground'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                    <p className={`text-xs mt-1 ${isCoach ? 'text-white/60' : 'text-muted-foreground'}`}>
                      {format(new Date(m.created_date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder={`Message ${coacheeEmail}...`}
            rows={2}
            className="flex-1"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            size="sm"
            className="self-end"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Delivered via in-app notification and email. Press ⌘+Enter to send.
        </p>
      </CardContent>
    </Card>
  );
}