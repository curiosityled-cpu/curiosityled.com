/**
 * SIEnrichedNarrative — surfaces the SI-woven pattern narrative.
 * Calls weaveSimplifiedIntelligence backend function and displays
 * the enriched narrative woven with situational intelligence context.
 * SI is a supporting layer — not the headline.
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Brain, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function SIEnrichedNarrative({ trends, baseNarrative }) {
  const { user } = useAuth();

  const { data: enriched, isLoading } = useQuery({
    queryKey: ['si-narrative', user?.email],
    queryFn: async () => {
      const res = await base44.functions.invoke('weaveSimplifiedIntelligence', {
        user_email: user.email,
      });
      return res?.data || null;
    },
    enabled: !!user?.email && !!trends,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  // Fallback: use base narrative if SI enrichment fails or is loading
  const narrativeToShow = enriched?.enhanced_narrative || baseNarrative || trends?.trend_narrative;
  const hasSIContext = enriched?.si_status === 'enriched';

  if (!narrativeToShow && !isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0202ff]/4 border border-[#0202ff]/10 rounded-xl p-3.5 space-y-2"
    >
      {isLoading ? (
        <div className="space-y-1.5">
          <div className="h-3 bg-[#0202ff]/10 rounded animate-pulse w-full" />
          <div className="h-3 bg-[#0202ff]/10 rounded animate-pulse w-4/5" />
          <div className="h-3 bg-[#0202ff]/10 rounded animate-pulse w-3/5" />
        </div>
      ) : (
        <p className="text-sm text-gray-700 leading-relaxed italic">
          "{narrativeToShow}"
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0202ff]/8 text-[#0202ff]">
          <Brain className="w-2.5 h-2.5" />
          Atreus interpretation
        </span>
        {hasSIContext && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
            <Sparkles className="w-2.5 h-2.5" />
            Situational context applied
          </span>
        )}
      </div>
    </motion.div>
  );
}