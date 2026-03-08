import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Sparkles, Loader2, CheckCircle, User, Brain, TrendingUp } from "lucide-react";

export default function AIAssignmentRecommender({ requests, programAdmins, onClose, onAssign }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (requests.length > 0 && programAdmins.length > 0) {
      generateRecommendations();
    }
  }, []);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('getAIAssignmentRecommendations', {
        requests: requests.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
          request_type: r.request_type,
          priority: r.priority,
          budget_amount: r.budget_amount,
          audience_size: r.audience_size,
          due_date: r.due_date
        })),
        programAdmins: programAdmins.map(a => ({
          email: a.email,
          full_name: a.full_name,
          specializations: a.specializations,
          workload: a.workload
        }))
      });

      if (data?.success) {
        setRecommendations(data.recommendations);
      } else {
        toast.error('Failed to generate recommendations');
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRecommendation = async (recommendation) => {
    setAssigning(true);
    try {
      await base44.entities.DevelopmentRequest.update(recommendation.request_id, {
        assigned_to_email: recommendation.recommended_admin_email,
        status: 'assigned'
      });

      toast.success('Request assigned successfully');
      setRecommendations(prev => prev.filter(r => r.request_id !== recommendation.request_id));
      
      if (recommendations.length === 1) {
        onAssign();
        onClose();
      }
    } catch (error) {
      console.error('Error assigning request:', error);
      toast.error('Failed to assign request');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            AI Assignment Recommendations
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Analyzing requests and Program Admin capacity...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, idx) => (
              <Card key={idx} className="border-2 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{rec.request_title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{rec.request_type?.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">
                      {rec.confidence_score}% Match
                    </Badge>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <p className="font-medium text-blue-900">Recommended: {rec.recommended_admin_name}</p>
                    </div>
                    <p className="text-sm text-blue-800">{rec.rationale}</p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <TrendingUp className="w-4 h-4" />
                    <span>Current load: {rec.current_workload} active items</span>
                  </div>

                  <Button
                    onClick={() => handleAcceptRecommendation(rec)}
                    disabled={assigning}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept & Assign
                  </Button>
                </CardContent>
              </Card>
            ))}

            {recommendations.length === 0 && !loading && (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No recommendations available</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}