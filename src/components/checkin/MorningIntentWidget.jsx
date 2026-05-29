import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

const focusCategories = [
  { value: 'delegation', label: '👥 Delegation — hand off work' },
  { value: 'strategic_work', label: '🎯 Strategic work — the big picture' },
  { value: 'team_support', label: '🤝 Team support — 1:1s, coaching' },
  { value: 'personal_development', label: '📚 Personal development — learning' },
  { value: 'other', label: '⭐ Other' },
];

export default function MorningIntentWidget({ userEmail }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [category, setCategory] = useState('delegation');
  const [intention, setIntention] = useState('');

  const handleSubmit = async () => {
    if (!intention.trim()) {
      toast.error('Please enter your focus intention');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.ManagerPulse.create({
        user_email: userEmail,
        source: 'web',
        prompt_type: 'morning_intent',
        focus_category: category,
        focus_intention: intention,
        // Minimal default values
        energy_level: 'steady',
        mental_clarity: 3,
        perceived_load: 'manageable',
      });

      setSubmitted(true);
      toast.success('Morning intention captured');

      setTimeout(() => {
        setShow(false);
        setSubmitted(false);
        setIntention('');
        setCategory('delegation');
      }, 2000);
    } catch (error) {
      console.error('Failed to save intention:', error);
      toast.error('Failed to save intention');
    } finally {
      setLoading(false);
    }
  };

  if (!show) {
    return (
      <Button
        onClick={() => setShow(true)}
        variant="outline"
        className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
      >
        ☀️ Set Today's Focus
      </Button>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">What matters most today?</CardTitle>
        <button
          onClick={() => setShow(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {submitted ? (
          <div className="flex items-center justify-center gap-2 py-4 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span>Intention set for today</span>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Focus Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {focusCategories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Intention</label>
              <Input
                placeholder="e.g., Delegate the Q3 planning to Alex"
                value={intention}
                onChange={e => setIntention(e.target.value)}
                className="bg-white"
                disabled={loading}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={loading || !intention.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Set Focus'
                )}
              </Button>
              <Button
                onClick={() => setShow(false)}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Skip
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}