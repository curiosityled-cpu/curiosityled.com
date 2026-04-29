import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Map, BookOpen, Star, Clock, CheckCircle, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * JourneyDraftConfirmModal
 * Shows a proposed Journey draft and lets the user confirm creation.
 * On confirm: creates LearningJourney (draft) + DevelopmentExperience records.
 */
export default function JourneyDraftConfirmModal({ draft, user, onConfirm, onCancel }) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [createdJourneyId, setCreatedJourneyId] = useState(null);

  if (!draft) return null;

  const handleCreate = async () => {
    setCreating(true);
    try {
      const userEmail = user?.email || user?.data?.email;
      const clientId = user?.client_id || user?.data?.client_id || null;

      // Build learning_items from matched resources
      const learningItems = (draft.learning_resources || []).map(res => ({
        resource_id: res.id,
        title: res.title,
        provider: res.provider || '',
        url: res.url || '',
        status: 'not_started',
      }));

      // Build experiences array
      const experienceItems = (draft.experiences || []).map(exp => ({
        title: exp.title,
        type: exp.type || 'stretch_project',
        description: exp.description,
        status: 'planned',
        expected_impact: exp.expected_impact || 5,
      }));

      // Calculate target date
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (draft.estimated_duration_days || 30));
      const targetDateStr = targetDate.toISOString().split('T')[0];

      // Create the DevelopmentPlan
      const plan = await base44.entities.DevelopmentPlan.create({
        user_email: userEmail,
        title: draft.title,
        description: draft.description,
        target_competencies: [draft.competency_focus].filter(Boolean),
        status: 'active',
        target_date: targetDateStr,
        experiences: experienceItems,
        learning_items: learningItems,
        client_id: clientId,
      });

      setCreatedJourneyId(plan.id);
      onConfirm?.(plan.id);
      toast.success('Journey created successfully!');
    } catch (error) {
      console.error('Error creating journey:', error);
      toast.error('Failed to create Journey. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleNavigate = () => {
    navigate('/my-development?tab=journeys');
    onCancel?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ backgroundColor: '#0202ff', borderRadius: '1rem 1rem 0 0' }}>
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-white" />
            <h2 className="font-semibold text-white text-base">Your Journey Draft</h2>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {createdJourneyId ? (
            /* Success state */
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 text-lg mb-1">Journey Created!</h3>
              <p className="text-gray-600 text-sm mb-4">
                Your journey <strong>"{draft.title}"</strong> has been saved and is now active in My Development.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleNavigate}
                  className="gap-2 text-white"
                  style={{ backgroundColor: '#0202ff' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0101dd'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0202ff'}
                >
                  <ExternalLink className="w-4 h-4" />
                  View My Journeys
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Journey title & focus */}
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{draft.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{draft.description}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {draft.competency_focus && (
                    <Badge className="text-white text-xs" style={{ backgroundColor: '#0202ff' }}>
                      Focus: {draft.competency_focus}
                    </Badge>
                  )}
                  {draft.estimated_duration_days && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="w-3 h-3" />
                      {draft.estimated_duration_days} days
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs text-gray-500">Draft</Badge>
                </div>
              </div>

              {/* Success outcome */}
              {draft.success_outcome && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">Success Outcome</p>
                  <p className="text-sm text-green-700">{draft.success_outcome}</p>
                </div>
              )}

              {/* Experiences */}
              {draft.experiences?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Development Experiences ({draft.experiences.length})
                  </p>
                  <div className="space-y-2">
                    {draft.experiences.map((exp, i) => (
                      <div key={i} className="flex items-start gap-3 bg-blue-50 rounded-lg p-3">
                        <Star className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{exp.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{exp.description}</p>
                          {exp.type && (
                            <span className="text-[10px] text-blue-600 capitalize">{exp.type.replace(/_/g, ' ')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Resources */}
              {draft.learning_resources?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Learning Resources ({draft.learning_resources.length})
                  </p>
                  <div className="space-y-2">
                    {draft.learning_resources.map((res, i) => (
                      <div key={i} className="flex items-start gap-3 bg-purple-50 rounded-lg p-3">
                        <BookOpen className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{res.title}</p>
                          {res.provider && <p className="text-xs text-gray-500">{res.provider}</p>}
                          {res.type && (
                            <span className="text-[10px] text-purple-600 capitalize">{res.type}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {draft.learning_resources?.length === 0 && (
                <p className="text-xs text-gray-400 italic">No matching learning resources found in the library for this competency. You can add resources manually in the Journey Builder.</p>
              )}

              {/* CTA */}
              <div className="pt-2 border-t flex gap-3">
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 gap-2 text-white"
                  style={{ backgroundColor: '#0202ff' }}
                  onMouseEnter={e => !creating && (e.currentTarget.style.backgroundColor = '#0101dd')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0202ff')}
                >
                  {creating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating Journey...</>
                  ) : (
                    <><Map className="w-4 h-4" /> Yes, Create This Journey</>
                  )}
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={creating}>
                  Not Yet
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}