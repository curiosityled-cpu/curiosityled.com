import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { FileText, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

export default function DecisionJournalSummary() {
  const { user } = useAuth();

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decision-journal-summary', user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.DecisionJournal.filter(
          { user_email: user.email },
          '-created_date',
          3
        );
      } catch {
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || decisions.length === 0) return null;

  const readyForReview = decisions.filter(
    d => d.status !== 'completed' && Math.floor((Date.now() - new Date(d.created_date)) / 86400000) >= 1
  ).length;

  const completed = decisions.filter(d => d.status === 'completed').length;

  return (
    <Link to="/decision-journal">
      <Card className="shadow-sm border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer rounded-2xl">
        <CardContent className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-3.5 h-3.5 text-[#0202ff]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Decision Journal</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {readyForReview > 0
                    ? `${readyForReview} decision${readyForReview > 1 ? 's' : ''} ready to review`
                    : `${completed} completed${completed !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}