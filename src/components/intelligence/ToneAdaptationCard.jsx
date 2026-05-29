/**
 * ToneAdaptationCard — Shows when & why Atreus is adapting tone
 *
 * Displays current tone + recommended shift + reasoning
 */
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Info, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TONE_DESCRIPTIONS = {
  gentle_observant: 'Warm, patient, curious. Gentle with observations.',
  warm_candid: 'Direct but kind. Honest colleague who respects you.',
  close_friend_candid: 'Natural, real, invested. Like a close peer.',
  respectfully_confronting: 'Frank about patterns. Holding you accountable to your values.'
};

export default function ToneAdaptationCard() {
  const { user } = useAuth();
  const [adaptation, setAdaptation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchAdaptation = async () => {
      try {
        const response = await base44.functions.invoke('computeAdaptiveTone', {});
        setAdaptation(response.data);
      } catch (error) {
        console.error('Error fetching tone adaptation:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchAdaptation();
  }, [user]);

  const handleApplyTone = async () => {
    if (!adaptation?.should_adapt) return;

    setApplying(true);
    try {
      await base44.entities.TonePreference.update(user.email, {
        tone_mode: adaptation.recommended_tone,
        user_understanding_ack: true
      });
      toast.success('Atreus tone updated to match your current state');
      setAdaptation(prev => ({
        ...prev,
        current_tone: adaptation.recommended_tone,
        should_adapt: false
      }));
    } catch (error) {
      console.error('Error applying tone:', error);
      toast.error('Failed to update tone');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Atreus Tone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!adaptation) {
    return null;
  }

  return (
    <Card className={adaptation.should_adapt ? 'border-blue-200 bg-blue-50' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Atreus Tone
          </CardTitle>
          <Badge variant="outline">
            {adaptation.current_tone.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Current approach:</p>
          <p className="text-sm text-gray-700">{TONE_DESCRIPTIONS[adaptation.current_tone]}</p>
        </div>

        {adaptation.should_adapt && (
          <>
            <div className="flex items-center gap-2">
              <div className="h-px bg-gray-300 flex-1" />
              <span className="text-xs text-gray-500">→</span>
              <div className="h-px bg-gray-300 flex-1" />
            </div>

            <div className="p-3 bg-blue-100 rounded-lg border border-blue-300">
              <p className="text-xs text-blue-600 font-semibold mb-1">Suggested shift:</p>
              <p className="text-sm text-blue-900 font-medium mb-2">
                {adaptation.recommended_tone.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-blue-800">{TONE_DESCRIPTIONS[adaptation.recommended_tone]}</p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">{adaptation.reason}</p>
              </div>
              {adaptation.context_flags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {adaptation.context_flags.map((flag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {flag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleApplyTone}
              disabled={applying}
              className="w-full"
              style={{ backgroundColor: '#0202ff' }}
              onMouseEnter={(e) => !applying && (e.currentTarget.style.backgroundColor = '#0101dd')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0202ff')}
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  Apply This Tone
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </>
        )}

        {!adaptation.should_adapt && (
          <p className="text-xs text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-200">
            ✓ {adaptation.reason}
          </p>
        )}
      </CardContent>
    </Card>
  );
}