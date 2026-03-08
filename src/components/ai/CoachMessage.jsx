import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, ExternalLink, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CoachMessage({ message, onActionClick }) {
  const isUser = message.role === "user";
  const [feedback, setFeedback] = useState(message.feedback || null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleFeedback = async (rating) => {
    if (submittingFeedback || isUser || feedback !== null) return;
    
    setSubmittingFeedback(true);
    try {
      const user = await base44.auth.me();
      const prefs = await base44.entities.UserPreference.filter({ user_email: user.email });
      
      const feedbackEntry = {
        timestamp: new Date().toISOString(),
        rating: rating,
        message_preview: message.content.substring(0, 100)
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
      toast.success('Feedback recorded');
    } catch (error) {
      console.error('Error saving feedback:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const renderToolCalls = () => {
    if (!message.tool_calls || message.tool_calls.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {message.tool_calls.map((toolCall, index) => (
          <div 
            key={index}
            className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg"
          >
            <div className="flex-shrink-0 mt-0.5">
              {toolCall.status === 'running' && (
                <Clock className="w-4 h-4 text-purple-600 animate-pulse" />
              )}
              {toolCall.status === 'completed' && (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              )}
              {toolCall.status === 'failed' && (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-purple-900">
                {formatToolName(toolCall.name)}
              </p>
              {toolCall.result && (
                <p className="text-xs text-purple-700 mt-1">
                  {toolCall.result}
                </p>
              )}
              {toolCall.status === 'running' && (
                <p className="text-xs text-purple-600 mt-1">
                  Executing action...
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDataSuggestions = () => {
    if (!message.data) return null;

    // Handle white label suggestions
    if (message.data.suggestions || message.data.color_palette) {
      return (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-2">
            💡 Branding Suggestions:
          </p>
          {message.data.suggestions && (
            <ul className="text-sm text-blue-800 space-y-1 mb-2">
              {message.data.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          )}
          {message.data.color_palette && (
            <div className="flex gap-3 mt-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border-2 border-white shadow"
                  style={{ backgroundColor: message.data.color_palette.primary }}
                />
                <span className="text-xs text-blue-700">
                  Primary: {message.data.color_palette.primary}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border-2 border-white shadow"
                  style={{ backgroundColor: message.data.color_palette.secondary }}
                />
                <span className="text-xs text-blue-700">
                  Secondary: {message.data.color_palette.secondary}
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Handle onboarding plan suggestions
    if (message.data.role || message.data.plan_duration_days) {
      return (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-900 mb-2">
            📋 Onboarding Plan:
          </p>
          <div className="text-sm text-green-800 space-y-1">
            {message.data.role && (
              <p><strong>Role:</strong> {message.data.role}</p>
            )}
            {message.data.department && (
              <p><strong>Department:</strong> {message.data.department}</p>
            )}
            {message.data.plan_duration_days && (
              <p><strong>Duration:</strong> {message.data.plan_duration_days} days</p>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const formatToolName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] ${isUser ? 'ml-auto' : 'mr-auto'}`}>
        <div
          className={`rounded-2xl px-4 py-2 ${
            isUser
              ? 'text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          }`}
          style={isUser ? { backgroundColor: '#0043ef' } : {}}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="text-sm leading-relaxed mb-2 last:mb-0">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="text-sm space-y-1 my-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="text-sm space-y-1 my-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  code: ({ inline, children }) =>
                    inline ? (
                      <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-gray-100 p-2 rounded text-xs my-2">
                        {children}
                      </code>
                    ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {!isUser && renderToolCalls()}
        {!isUser && renderDataSuggestions()}
        
        <div className="flex items-center justify-between mt-1 px-1">
          <p className="text-xs text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          
          {!isUser && !message.isPendingConfirmation && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleFeedback(1)}
                disabled={submittingFeedback || feedback !== null}
                className={`p-1 rounded transition-all ${
                  feedback === 1 
                    ? 'bg-green-100 text-green-600' 
                    : 'text-gray-400 hover:bg-gray-100 hover:text-green-600'
                }`}
                title="Helpful"
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleFeedback(-1)}
                disabled={submittingFeedback || feedback !== null}
                className={`p-1 rounded transition-all ${
                  feedback === -1 
                    ? 'bg-red-100 text-red-600' 
                    : 'text-gray-400 hover:bg-gray-100 hover:text-red-600'
                }`}
                title="Not helpful"
              >
                <ThumbsDown className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}