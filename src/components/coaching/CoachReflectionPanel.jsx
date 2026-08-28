import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function CoachReflectionPanel({ engagementId, coachEmail }) {
  const [reflections, setReflections] = useState([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (engagementId) loadReflections();
  }, [engagementId]);

  const loadReflections = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.CoachReflection.filter(
        { engagement_id: engagementId },
        '-created_date'
      );
      setReflections(data);
    } catch (e) {
      console.error('Error loading reflections:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      await base44.entities.CoachReflection.create({
        coach_email: coachEmail,
        engagement_id: engagementId,
        reflection_text: newText.trim(),
      });
      setNewText('');
      loadReflections();
    } catch (e) {
      console.error('Error saving reflection:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.CoachReflection.delete(id);
      setReflections(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Error deleting reflection:', e);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900/40">
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-foreground">Confidential Coaching Notes</h3>
          <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
            Private to you
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          These notes are visible only to you. They are never shared with HR, the coachee, or anyone else.
        </p>

        <div className="flex gap-2 mb-3">
          <Textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Write a private reflection..."
            rows={2}
            className="flex-1 bg-white dark:bg-background"
          />
          <Button
            onClick={handleSave}
            disabled={saving || !newText.trim()}
            size="sm"
            className="self-end"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : reflections.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No private notes yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {reflections.map(r => (
              <div key={r.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-white dark:bg-card border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{r.reflection_text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(r.created_date), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}