import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Users, TrendingUp, Building2, Target, BarChart3, Crown, ArrowLeft, Award } from "lucide-react";
import { motion } from "framer-motion";
import ProgramManagerView from "../components/command/ProgramManagerView";
import ManagerOfManagersView from "../components/command/ManagerOfManagersView";
import EnterpriseAnalytics from "@/components/analytics/EnterpriseAnalytics";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { useAuth } from "@/components/useAuth";
import { usePageContext } from "../Layout"; // Changed import path from "../layout" to "../Layout"
import { useViewportTracking } from "@/components/hooks/useViewportTracking"; // Added import

function CommandCenter() {
  const { user, appRole, isManagerOfManagers, isOrgLeader, isProgramManager, isAdmin, isSuperAdmin, hasPermission, loading: authLoading } = useAuth();
  const { updatePageContext } = usePageContext(); // Added destructuring

  // Set initial view based on user's app_role
  const getInitialView = () => {
    if (isManagerOfManagers) return 'manager';
    if (isOrgLeader) return 'organizational';
    if (isProgramManager) return 'program';
    // Admin Level 2 and 3 default to welcome to let them choose
    if (isAdmin || isSuperAdmin) return 'welcome';
    return 'welcome'; // Default for any other role not specifically handled
  };
  
  const [currentView, setCurrentView] = useState(getInitialView());

  const views = [
    {
      id: "program",
      title: "Program Manager Dashboard",
      description: "Manage leadership development cohorts and track participant progress",
      icon: Target,
      color: "bg-blue-600",
      audience: "L&D Teams",
      features: ["Cohort Analytics", "Progress Tracking", "Intervention Alerts"],
      useCase: "Managing 50 participants across 3 leadership development cohorts"
    },
    {
      id: "manager",
      title: "Manager of Managers View",
      description: "Monitor your leadership team's performance and development needs",
      icon: Users,
      color: "bg-purple-600", 
      audience: "Senior Leaders",
      features: ["Team Leadership Metrics", "Direct Report Insights", "Succession Planning"],
      useCase: "VP Operations overseeing 8 regional managers"
    },
    {
      id: "organizational",
      title: "Enterprise Leadership Analytics",
      description: "Enterprise-wide leadership effectiveness and strategic insights",
      icon: Building2,
      color: "bg-emerald-600",
      audience: "C-Suite / CHRO",
      features: ["Org-wide Analytics", "Bench Strength", "Strategic Insights"],
      useCase: "CEO tracking leadership capability across 2,500 employees"
    }
  ];

  // Enhanced: Define section IDs based on active view
  const getSectionIds = () => {
    const sections = [];
    
    if (currentView === 'welcome') {
      sections.push('section-welcome-header', 'section-view-cards', 'section-all-views-info');
    } else if (currentView === 'program') {
      sections.push('section-program-manager-view');
    } else if (currentView === 'manager') {
      sections.push('section-manager-of-managers-view');
    } else if (currentView === 'organizational') {
      sections.push('section-enterprise-analytics-view');
    }
    
    return sections;
  };

  const sectionIds = getSectionIds();

  // Enhanced: Viewport tracking with context updates
  const { visibleSections, focusedSection } = useViewportTracking(
    sectionIds,
    (viewportData) => {
      updatePageContext({
        viewport_focus: {
          focused_section: viewportData.focused,
          visible_sections: viewportData.visible,
          view_mode: currentView, // Using currentView to match the component's state
          section_count: sectionIds.length
        }
      });
    }
  );

  // Consider adding loading/permission checks if they are not entirely handled by withAuthProtection
  // For example, if specific data loading is needed based on the user's role after initial auth.
  if (authLoading) {
    return <div className="flex justify-center items-center h-screen text-lg">Loading Command Center...</div>;
  }
  // The withAuthProtection HOC should handle access denied, but if there's an internal permission check:
  // if (!hasPermission('access_command_center_feature')) {
  //   return <div className="flex justify-center items-center h-screen text-red-500 text-lg">Access Denied</div>;
  // }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {currentView === "welcome" && (
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
              id="section-welcome-header" // Added ID for tracking
            >
              <Badge className="mb-4 bg-emerald-100 text-emerald-800">
                Journey 3: Team Leader Command Center
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Leadership Analytics Dashboard
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Choose your perspective to see how leadership analytics provide insights 
                at different organizational levels.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8" id="section-view-cards"> {/* Added ID for tracking */}
              {views.map((view, index) => (
                <motion.div
                  key={view.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg cursor-pointer"
                        onClick={() => setCurrentView(view.id)}>
                    <CardHeader className="text-center pb-4">
                      <div className={`w-16 h-16 ${view.color} rounded-2xl mx-auto mb-4 flex items-center justify-center`}>
                        <view.icon className="w-8 h-8 text-white" />
                      </div>
                      
                      <Badge variant="outline" className="mb-3 w-fit mx-auto">
                        <Crown className="w-3 h-3 mr-1" />
                        {view.audience}
                      </Badge>
                      
                      <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                        {view.title}
                      </CardTitle>
                      
                      <p className="text-gray-600 leading-relaxed text-sm">
                        {view.description}
                      </p>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3 mb-6">
                        {view.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg mb-4">
                        <p className="text-xs text-gray-600 font-medium mb-1">Example Use Case:</p>
                        <p className="text-xs text-gray-800">{view.useCase}</p>
                      </div>
                      
                      <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium">
                        View Dashboard
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 text-center" id="section-all-views-info"> {/* Added ID for tracking */}
              <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-emerald-50 max-w-2xl mx-auto">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">All Views Include</h3>
                  <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                    <span>• Real-time Analytics</span>
                    <span>• AI-powered Insights</span>
                    <span>• Intervention Recommendations</span>
                    <span>• Progress Tracking</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {currentView !== "welcome" && (
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {currentView === "program" && (
              <div id="section-program-manager-view"> {/* Added ID for tracking */}
                <ProgramManagerView onBack={() => setCurrentView("welcome")} />
              </div>
            )}
            {currentView === "manager" && (
              <div id="section-manager-of-managers-view"> {/* Added ID for tracking */}
                <ManagerOfManagersView onBack={() => setCurrentView("welcome")} />
              </div>
            )}
            {currentView === "organizational" && (
              <div id="section-enterprise-analytics-view"> {/* Added ID for tracking */}
                <EnterpriseAnalytics onBack={() => setCurrentView("welcome")} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuthProtection(CommandCenter, ['User Level 2', 'User Level 3', 'Admin Level 1', 'Admin Level 2', 'Admin Level 3']);