import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, Calendar, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const EXP_TYPE_LABELS = {
  leadership_coaching: 'Leadership Coaching', stretch_project: 'Stretch Project',
  leadership_opportunity: 'Leadership Opportunity', mentorship: 'Mentorship',
  conference_event: 'Conference / Event', volunteer_leadership: 'Volunteer Leadership',
  cross_functional_project: 'Cross-Functional Project', speaking_opportunity: 'Speaking Opportunity', other: 'Other',
};

const STATUS_BADGE = {
  planned: 'bg-purple-100 text-purple-700', in_progress: 'bg-blue-100 text-blue-700',
  active: 'bg-blue-100 text-blue-700', completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function ExperienceCard({ exp, index = 0, onEdit, onDelete, onLogSession }) {
  const isCoaching = exp.type === 'leadership_coaching';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-medium text-gray-900 leading-snug">{exp.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[exp.status] || 'bg-gray-100 text-gray-600'}`}>{exp.status}</span>
                {exp.group_assignment === 'group' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Group
                  </span>
                )}
              </div>
              <p className="text-xs text-[#0202ff] mb-1">{exp.user_email || exp.coach_email || '—'}</p>
              {exp.type && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full inline-block mb-2">{EXP_TYPE_LABELS[exp.type] || exp.type}</p>}
              {exp.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{exp.description}</p>}
              <div className="flex flex-wrap gap-1">
                {exp.competencies?.slice(0, 3).map(c => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{c}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {isCoaching && onLogSession && (
                <button onClick={() => onLogSession(exp)} className="text-gray-400 hover:text-[#0202ff] transition-colors" title="Log session">
                  <Calendar className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => onEdit(exp)} className="text-gray-400 hover:text-[#0202ff] transition-colors" title="Edit">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(exp.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}