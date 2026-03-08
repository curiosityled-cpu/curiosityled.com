import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FeedbackButton({ messageContent, existingFeedback = null }) {
  const [feedback, setFeedback] = useState(existingFeedback);
  const [submitting, setSubmitting] = useState(false);

  const handleFeedback = async (rating) => {
    if (submitting || feedback !== null) return;
    
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      const prefs = await base44.entities.UserPreference.filter({ user_email: user.email });
      
      const feedbackEntry = {
        timestamp: new Date().toISOString(),
        rating: rating,
        message_preview: messageContent.substring(0, 100)
      };

      if (prefs.length > 0) {
        const existingFeedback = prefs[0].atreus_preferences?.feedback_history || [];
        await base44.entities.UserPreference.update(prefs[0].id, {
          atreus_preferences: {
            ...prefs[0].atreus_preferences,
            feedback_history: [...existingFeedback, feedbackEntry].slice(-50)
          }
        });
      } else {
        await base44.entities.UserPreference.create({
          user_email: user.email,
          atreus_preferences: {
            feedback_history: [feedbackEntry]
          }
        });
      }

      setFeedback(rating);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error('Failed to save feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleFeedback(1)}
        disabled={submitting || feedback !== null}
        className={`p-1.5 rounded-md transition-all ${
          feedback === 1 
            ? 'bg-green-100 text-green-600' 
            : 'text-gray-400 hover:bg-gray-100 hover:text-green-600'
        }`}
        title="Helpful"
      >
        {submitting && feedback === null ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ThumbsUp className="w-3.5 h-3.5" />
        )}
      </button>
      <button
        onClick={() => handleFeedback(-1)}
        disabled={submitting || feedback !== null}
        className={`p-1.5 rounded-md transition-all ${
          feedback === -1 
            ? 'bg-red-100 text-red-600' 
            : 'text-gray-400 hover:bg-gray-100 hover:text-red-600'
        }`}
        title="Not helpful"
      >
        {submitting && feedback === null ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ThumbsDown className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}