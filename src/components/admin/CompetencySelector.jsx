import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Brain, 
  Target,
  Loader2,
  Info,
  Save
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useCompetencies } from "@/components/contexts/CompetencyContext";
import { useAuth } from "@/components/useAuth";

export default function CompetencySelector({ open, onOpenChange }) {
  const { user, isSuperAdmin, isHRAdmin, isPartnerBusinessAdmin, isPlatformAdmin } = useAuth();
  const { 
    allCompetencies, 
    selectedCompetencies, 
    competenciesConfigured,
    updateSelectedCompetencies,
    loading: contextLoading 
  } = useCompetencies();

  const [localSelected, setLocalSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  // Initialize local selection when dialog opens
  useEffect(() => {
    if (open) {
      setLocalSelected(selectedCompetencies.map(c => c.id));
    }
  }, [open, selectedCompetencies]);

  const canConfigure = isSuperAdmin || isHRAdmin || isPartnerBusinessAdmin || isPlatformAdmin;
  const isPlatformAdminWithoutClient = isPlatformAdmin && !user?.client_id;

  // Group competencies by category
  const competenciesByCategory = allCompetencies.reduce((acc, comp) => {
    const category = comp.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(comp);
    return acc;
  }, {});

  // Situational Intelligence is always required
  const siCompetency = allCompetencies.find(c => 
    c.category === 'Situational Intelligence' || 
    c.name.toLowerCase().includes('situational intelligence')
  );

  const handleToggleCompetency = (competencyId) => {
    // Don't allow deselecting SI
    if (siCompetency && competencyId === siCompetency.id) {
      toast.error('Situational Intelligence is always required');
      return;
    }

    setLocalSelected(prev => {
      if (prev.includes(competencyId)) {
        return prev.filter(id => id !== competencyId);
      } else {
        // Limit to 5 core + SI = 6 total
        const currentNonSI = prev.filter(id => siCompetency ? id !== siCompetency.id : true);
        if (currentNonSI.length >= 5) {
          toast.error('Maximum 5 core competencies allowed (plus Situational Intelligence)');
          return prev;
        }
        return [...prev, competencyId];
      }
    });
  };

  const handleSave = async () => {
    // Ensure SI is included
    let finalSelection = [...localSelected];
    if (siCompetency && !finalSelection.includes(siCompetency.id)) {
      finalSelection.push(siCompetency.id);
    }

    // Validate: must have at least 3 core competencies
    const coreCount = finalSelection.filter(id => siCompetency ? id !== siCompetency.id : true).length;
    if (coreCount < 3) {
      toast.error('Please select at least 3 core competencies');
      return;
    }

    setSaving(true);
    try {
      const result = await updateSelectedCompetencies(finalSelection);
      if (result.success) {
        toast.success('Competencies updated successfully');
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to update competencies');
      }
    } catch (error) {
      toast.error('Failed to save competencies');
    } finally {
      setSaving(false);
    }
  };

  const coreSelectedCount = localSelected.filter(id => siCompetency ? id !== siCompetency.id : true).length;

  if (!canConfigure) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Configure Organization Competencies
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Banner */}
          <Alert className={isPlatformAdminWithoutClient ? "bg-blue-50 border-blue-200" : competenciesConfigured ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}>
            <Info className={`w-4 h-4 ${isPlatformAdminWithoutClient ? 'text-blue-600' : competenciesConfigured ? 'text-green-600' : 'text-amber-600'}`} />
            <AlertDescription className={isPlatformAdminWithoutClient ? 'text-blue-800' : competenciesConfigured ? 'text-green-800' : 'text-amber-800'}>
              {isPlatformAdminWithoutClient
                ? "As Platform Admin, all competencies are available by default. To configure per-client competencies, log in as that client's Super Administrator."
                : competenciesConfigured 
                  ? "Your organization's core competencies are configured. You can update them at any time."
                  : "Your organization hasn't selected core competencies yet. Please select 3-5 competencies that are most relevant for your organization. Situational Intelligence is always included."}
            </AlertDescription>
          </Alert>

          {/* Selection Counter */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Core Competencies:</span>
                <Badge className={coreSelectedCount >= 3 && coreSelectedCount <= 5 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                  {coreSelectedCount} / 5
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600">+ Situational Intelligence (always included)</span>
              </div>
            </div>
          </div>

          {/* Competency Selection */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(competenciesByCategory).map(([category, competencies]) => (
                <div key={category}>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    {category === 'Situational Intelligence' && <Brain className="w-4 h-4 text-purple-600" />}
                    {category}
                    {category === 'Situational Intelligence' && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                  </h3>
                  <div className="grid gap-3">
                    {competencies.map((competency) => {
                      const isSelected = localSelected.includes(competency.id);
                      const isSI = siCompetency && competency.id === siCompetency.id;
                      
                      return (
                        <motion.div
                          key={competency.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          } ${isSI ? 'border-purple-500 bg-purple-50' : ''}`}
                          onClick={() => handleToggleCompetency(competency.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected || isSI}
                              disabled={isSI}
                              onCheckedChange={() => handleToggleCompetency(competency.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{competency.name}</span>
                                {isSI && (
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    Always Included
                                  </Badge>
                                )}
                                {isSelected && !isSI && (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {competency.definition}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Validation Message */}
          {coreSelectedCount < 3 && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Please select at least {3 - coreSelectedCount} more core competencies.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || coreSelectedCount < 3 || isPlatformAdminWithoutClient}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Competencies
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}