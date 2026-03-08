import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Lock, X, Sparkles, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";

export default function BadgeGallery({ userEmail = null }) {
  const { user } = useAuth();
  const targetEmail = userEmail || user?.email;
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [allBadgeTemplates, setAllBadgeTemplates] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    loadBadges();
  }, [targetEmail]);

  const loadBadges = async () => {
    if (!targetEmail) return;

    try {
      const [userBadges, templates] = await Promise.all([
        base44.entities.UserBadge.filter({ user_email: targetEmail }),
        base44.entities.BadgeTemplate.filter({ is_active: true })
      ]);

      setEarnedBadges(userBadges);
      setAllBadgeTemplates(templates);
    } catch (error) {
      console.error("Error loading badges:", error);
    } finally {
      setLoading(false);
    }
  };

  const earnedBadgeIds = new Set(earnedBadges.map(b => b.badge_template_id));
  
  const categories = ["all", ...new Set(allBadgeTemplates.map(b => b.badge_category))];
  
  const filteredBadges = filterCategory === "all" 
    ? allBadgeTemplates 
    : allBadgeTemplates.filter(b => b.badge_category === filterCategory);

  const tierColors = {
    common: "from-gray-400 to-gray-600",
    uncommon: "from-green-400 to-green-600",
    rare: "from-blue-400 to-blue-600",
    epic: "from-purple-400 to-purple-600",
    legendary: "from-yellow-400 to-orange-600"
  };

  const tierLabels = {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary"
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Badge Gallery
              <UIBadge variant="outline" className="ml-2">
                {earnedBadgeIds.size} / {allBadgeTemplates.length}
              </UIBadge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filterCategory} onValueChange={setFilterCategory} className="mb-4">
            <TabsList className="flex flex-wrap h-auto">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="capitalize">
                  {cat === "all" ? "All" : cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {filteredBadges.map((template) => {
              const isEarned = earnedBadgeIds.has(template.id);
              const userBadge = earnedBadges.find(b => b.badge_template_id === template.id);

              return (
                <motion.div
                  key={template.id}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedBadge({ template, userBadge, isEarned })}
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-center p-2 cursor-pointer ${
                    isEarned 
                      ? `bg-gradient-to-br ${tierColors[template.rarity]} shadow-lg` 
                      : 'bg-gray-100 border-2 border-dashed border-gray-300 opacity-60'
                  }`}
                >
                  {isEarned ? (
                    <>
                      <div className="text-3xl mb-1">{template.icon_url || "🏆"}</div>
                      {userBadge && (
                        <Sparkles className="absolute top-1 right-1 w-3 h-3 text-yellow-300 animate-pulse" />
                      )}
                    </>
                  ) : (
                    <Lock className="w-8 h-8 text-gray-400" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {selectedBadge && (
          <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl ${
                    selectedBadge.isEarned 
                      ? `bg-gradient-to-br ${tierColors[selectedBadge.template.rarity]} shadow-lg` 
                      : 'bg-gray-100'
                  }`}>
                    {selectedBadge.isEarned ? (selectedBadge.template.icon_url || "🏆") : <Lock className="w-8 h-8 text-gray-400" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedBadge.template.badge_name}</h3>
                    <UIBadge className={`mt-1 bg-gradient-to-r ${tierColors[selectedBadge.template.rarity]}`}>
                      {tierLabels[selectedBadge.template.rarity]}
                    </UIBadge>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-gray-600">{selectedBadge.template.description}</p>

                {selectedBadge.isEarned && selectedBadge.userBadge ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-semibold">Earned</span>
                    </div>
                    <p className="text-sm text-green-700">
                      {new Date(selectedBadge.userBadge.earned_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="font-semibold text-orange-900 mb-2">How to Earn:</p>
                    <p className="text-sm text-orange-700">
                      {selectedBadge.template.criteria_config?.description || "Complete specific actions to unlock this badge"}
                    </p>
                    {selectedBadge.template.points_awarded > 0 && (
                      <p className="text-sm text-orange-600 mt-2 font-medium">
                        +{selectedBadge.template.points_awarded} points when earned
                      </p>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}