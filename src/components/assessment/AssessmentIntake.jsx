import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Brain, ArrowRight, Info, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function AssessmentIntake({ onComplete, loading }) {
  const [leadershipLevel, setLeadershipLevel] = useState('');
  const [sector, setSector] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Pre-fill if user has already set these
      if (currentUser.leadership_level) {
        setLeadershipLevel(currentUser.leadership_level);
      }
      if (currentUser.sector) {
        setSector(currentUser.sector);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleStart = async () => {
    console.log('Begin button clicked with:', { leadershipLevel, sector });
    
    // Save to user profile for future reference
    try {
      await base44.auth.updateMe({
        leadership_level: leadershipLevel,
        sector: sector
      });
      console.log('User profile updated');
    } catch (error) {
      console.warn('Could not update user profile:', error);
    }

    console.log('Calling onComplete');
    onComplete({ leadership_level: leadershipLevel, sector });
  };

  const canStart = leadershipLevel && sector;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-0 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-10 h-10 text-purple-600" />
          </div>
          <CardTitle className="text-3xl mb-2">Leadership Index Assessment</CardTitle>
          <CardDescription className="text-base">
            Before we begin, help us personalize your assessment experience
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-8">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Why we ask these questions:</p>
              <p className="text-blue-700">
                Your responses will be compared to leaders at your level in your industry, providing more relevant insights and development recommendations.
              </p>
            </div>
          </div>

          {/* Leadership Level */}
          <div className="space-y-2">
            <Label htmlFor="leadership-level" className="text-base font-semibold">
              What is your current leadership level?
            </Label>
            <Select value={leadershipLevel} onValueChange={setLeadershipLevel}>
              <SelectTrigger id="leadership-level" className="h-12">
                <SelectValue placeholder="Select your leadership level..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Level 1 (Leading Self)">
                  <div className="py-1">
                    <div className="font-medium">Level 1: Leading Self</div>
                    <div className="text-xs text-gray-500">Individual contributor, early career leader</div>
                  </div>
                </SelectItem>
                <SelectItem value="Level 2 (Leading Others)">
                  <div className="py-1">
                    <div className="font-medium">Level 2: Leading Others</div>
                    <div className="text-xs text-gray-500">First-time manager, team leader</div>
                  </div>
                </SelectItem>
                <SelectItem value="Level 3 (Leading Managers)">
                  <div className="py-1">
                    <div className="font-medium">Level 3: Leading Managers</div>
                    <div className="text-xs text-gray-500">Manager of managers, senior manager</div>
                  </div>
                </SelectItem>
                <SelectItem value="Level 4 (Leading Functions)">
                  <div className="py-1">
                    <div className="font-medium">Level 4: Leading Functions</div>
                    <div className="text-xs text-gray-500">Director, VP, functional leader</div>
                  </div>
                </SelectItem>
                <SelectItem value="Level 5 (Leading Organizations)">
                  <div className="py-1">
                    <div className="font-medium">Level 5: Leading Organizations</div>
                    <div className="text-xs text-gray-500">Executive, C-Suite, organizational leader</div>
                  </div>
                </SelectItem>
                <SelectItem value="HiPo Individual Contributor">
                  <div className="py-1">
                    <div className="font-medium">HiPo Individual Contributor</div>
                    <div className="text-xs text-gray-500">High potential IC without direct reports</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sector */}
          <div className="space-y-2">
            <Label htmlFor="sector" className="text-base font-semibold">
              What sector do you work in?
            </Label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger id="sector" className="h-12">
                <SelectValue placeholder="Select your industry sector..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Government">Government</SelectItem>
                <SelectItem value="Corporate/Private">Corporate/Private Sector</SelectItem>
                <SelectItem value="Non-Profit">Non-Profit</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assessment Info */}
          <div className="bg-gray-50 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">What to expect:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>24 scenario-based questions across 6 leadership competencies</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>20-30 minutes to complete</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Your progress is automatically saved</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Instant results with personalized development insights</span>
              </li>
            </ul>
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStart}
            disabled={!canStart || loading}
            className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Starting Assessment...
              </>
            ) : (
              <>
                Begin Assessment
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}