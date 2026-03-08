
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Brain, Sparkles, FileText, BarChart3, User, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import AILoadingAnimation from "../components/demo/AILoadingAnimation";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Assessment as AssessmentEntity } from '@/entities/Assessment';
import { User as UserEntity } from '@/entities/User';
import { withAuthProtection } from "@/components/hoc/withAuthProtection";

import SituationalIntelligenceCard from '../components/results/SituationalIntelligenceCard';
import CompetencyRadarChart from '../components/results/CompetencyRadarChart';
import DevelopmentGoals from '../components/results/DevelopmentGoals';
import AIInsightsCard from '../components/results/AIInsightsCard';
// import AICoachChat from '../components/results/AICoachChat'; // This import is removed as per the change
import CompetencyExplanations from '../components/results/CompetencyExplanations';

function Onboarding() {
  const [step, setStep] = useState("welcome");
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const checkPreviousAssessment = async () => {
      try {
        const user = await UserEntity.me();
        if (user && user.email) {
          const previous = await AssessmentEntity.filter({ email: user.email }, '-created_date', 1);
          if (previous.length > 0) {
            setHasCompleted(true);
          }
        }
      } catch (e) {
        console.log("Could not check for previous assessment.");
      }
    };
    checkPreviousAssessment();
  }, []);

  const assessmentData = {
    user: {
      first_name: "John",
      role_level: "Mid-Level Manager",
      sector: "Healthcare"
    },
    scores: {
      dm_pct: 78,
      comm_pct: 65,
      trm_pct: 80,
      collab_pct: 82,
      pm_pct: 85,
      si_pct: 73
    },
    analysis: {
      strengths: ["Strong collaboration skills", "Good decision-making under pressure"],
      development_areas: ["Communication clarity", "Resource allocation"],
      archetype: "Strategic Collaborator"
    },
    percentiles: {
      decision_making: 78,
      communication: 45,
      time_resource_management: 85,
      collaboration: 88,
      performance_management: 72,
      situational_intelligence: 65
    }
  };

  const handleStartAssessment = () => {
    setStep("loading");
    setTimeout(() => {
      setStep("results");
    }, 3500);
  };

  const WelcomeScreen = () => (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-purple-100 text-purple-800">
            Journey 2: Assess → Coach → Act
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Test Your Leadership Instincts
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Experience our adaptive assessment and receive instant, AI-powered
            scores, coaching, and development goals.
          </p>
        </motion.div>

        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
        >
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border p-8">
                <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <Brain className="w-8 h-8 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Leadership Assessment Options</h2>
                    <p className="text-gray-600 mb-6">Choose how you'd like to experience our assessment technology</p>
                </div>

                <div className="space-y-4 mb-6">
                    <Link to={createPageUrl("LeadershipAssessment")}>
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-200">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">Take the Real Assessment</h3>
                                        <p className="text-sm text-gray-600">Complete our live 8-minute leadership assessment and get your actual results</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-400" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {hasCompleted ? (
                       <Link to={createPageUrl("AssessmentResults")}>
                         <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-200">
                             <CardContent className="p-6">
                                 <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                         <BarChart3 className="w-6 h-6 text-blue-600" />
                                     </div>
                                     <div className="flex-1">
                                         <h3 className="font-semibold text-gray-900 mb-1">View My Results</h3>
                                         <p className="text-sm text-gray-600">See your previously completed assessment results</p>
                                     </div>
                                     <ArrowRight className="w-5 h-5 text-gray-400" />
                                 </div>
                             </CardContent>
                         </Card>
                       </Link>
                    ) : (
                       <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-200" onClick={handleStartAssessment}>
                           <CardContent className="p-6">
                               <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                       <BarChart3 className="w-6 h-6 text-blue-600" />
                                   </div>
                                   <div className="flex-1">
                                       <h3 className="font-semibold text-gray-900 mb-1">View Sample Results</h3>
                                       <p className="text-sm text-gray-600">See sample results from a healthcare leader to understand our assessment output</p>
                                   </div>
                                   <ArrowRight className="w-5 h-5 text-gray-400" />
                               </div>
                           </CardContent>
                       </Card>
                    )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border text-sm text-center text-gray-600">
                    Both options showcase our AI-powered coaching and personalized development recommendations
                </div>
            </div>
        </motion.div>
      </div>
    </div>
  );

  const SampleResultsScreen = () => (
    <div className="min-h-screen py-8 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => setStep("welcome")}
              variant="ghost"
              className="text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Assess → Coach → Act
            </Button>
            <span className="text-gray-300">|</span>
            <Link to={createPageUrl("Home")} className="text-gray-500 hover:text-gray-700">
              Return to Dashboard
            </Link>
          </div>
          
          <Badge className="mb-4 bg-purple-100 text-purple-800">
            Sample Leadership Results
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Leadership Profile for {assessmentData.user.first_name}
          </h1>
          <div className="flex items-center gap-2 text-gray-600">
            <User className="w-4 h-4" />
            <span>{assessmentData.user.role_level} in {assessmentData.user.sector}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-1 gap-8"> {/* Changed to lg:grid-cols-1 */}
          <div className="space-y-8"> {/* Removed lg:col-span-2 */}
            <div className="grid md:grid-cols-2 gap-6">
              <SituationalIntelligenceCard 
                score={assessmentData.scores.si_pct} 
                benchmark="Above 65% of peers in Healthcare"
              />
              <CompetencyRadarChart 
                scores={assessmentData.scores}
                userInfo={assessmentData.user}
              />
            </div>

            <CompetencyExplanations scores={assessmentData.scores} />
            <DevelopmentGoals />
            <AIInsightsCard analysis={assessmentData.analysis} scores={assessmentData.scores} />
          </div>
          
          {/* Removed AICoachChat component and its wrapping div */}
        </div>

        <div className="mt-12 text-center">
          <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Take Your Own Assessment</h3>
              <p className="text-gray-600 mb-4">Get your personalized leadership profile in just 8 minutes</p>
              <Link to={createPageUrl("LeadershipAssessment")}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3">
                  Start My Assessment
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {step === "welcome" && <WelcomeScreen />}
      {step === "loading" && (
        <div className="min-h-screen py-12">
            <AILoadingAnimation
                message="Calculating your leadership scores..."
                submessage="Benchmarking against 65,000+ leaders in our database"
            />
        </div>
      )}
      {step === "results" && <SampleResultsScreen />}
    </div>
  );
}

export default withAuthProtection(Onboarding, ['User Level 1']);
