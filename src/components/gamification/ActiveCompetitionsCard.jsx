import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Clock, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";

export default function ActiveCompetitionsCard() {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompetitions();
  }, [user?.email]);

  const loadCompetitions = async () => {
    if (!user?.email) return;

    try {
      const now = new Date().toISOString();
      const activeCompetitions = await base44.entities.Competition.filter({
        participant_emails: { $in: [user.email] },
        status: "active",
        end_date: { $gte: now }
      });

      const competitionsWithStandings = await Promise.all(
        activeCompetitions.map(async (comp) => {
          try {
            const standings = await base44.functions.invoke('generateLeaderboardData', {
              metric_type: comp.criteria_config?.metric || 'total_points',
              time_period: 'custom',
              start_date: comp.start_date,
              end_date: comp.end_date,
              participant_emails: comp.participant_emails
            });

            const userPosition = standings.data?.findIndex(s => s.user_email === user.email) + 1 || null;

            return {
              ...comp,
              standings: standings.data || [],
              userPosition
            };
          } catch (error) {
            console.error("Error loading standings:", error);
            return {
              ...comp,
              standings: [],
              userPosition: null
            };
          }
        })
      );

      setCompetitions(competitionsWithStandings);
    } catch (error) {
      console.error("Error loading competitions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const getProgressPercent = (competition) => {
    const now = new Date();
    const start = new Date(competition.start_date);
    const end = new Date(competition.end_date);
    return Math.min(100, ((now - start) / (end - start)) * 100);
  };

  if (loading) return null;

  if (competitions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Active Competitions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-6">
            No active competitions at this time
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Active Competitions
          <Badge variant="outline" className="ml-auto">{competitions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {competitions.map((competition) => (
          <motion.div
            key={competition.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{competition.competition_name}</h4>
                <p className="text-xs text-gray-600 mt-1">{competition.description}</p>
              </div>
              <Badge 
                variant={competition.competition_type === "team" ? "default" : "secondary"}
                className="capitalize"
              >
                {competition.competition_type}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{getTimeRemaining(competition.end_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span>{competition.participant_emails?.length || 0}</span>
              </div>
              {competition.userPosition && (
                <div className="flex items-center gap-2 text-blue-600 font-medium">
                  <TrendingUp className="w-4 h-4" />
                  <span>#{competition.userPosition}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Progress</span>
                <span>{Math.round(getProgressPercent(competition))}%</span>
              </div>
              <Progress value={getProgressPercent(competition)} className="h-2" />
            </div>

            {competition.standings.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-2 space-y-1">
                <p className="text-xs font-medium text-gray-700 mb-2">Top 3:</p>
                {competition.standings.slice(0, 3).map((standing, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className={standing.user_email === user.email ? "font-bold text-blue-600" : "text-gray-700"}>
                      {idx + 1}. {standing.user_name}
                    </span>
                    <span className="font-medium">{standing.score}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}