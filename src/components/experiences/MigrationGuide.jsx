import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  CheckCircle, 
  Map, 
  User, 
  Users, 
  Settings, 
  ArrowRight,
  Info,
  Sparkles
} from "lucide-react";

export default function MigrationGuide() {
  return (
    <div className="space-y-6">
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <CardTitle>Migration Complete!</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            The Experience navigation has been successfully reorganized. All existing functionality 
            has been preserved and enhanced with better organization.
          </p>
          
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold mb-3">Where to Find What You Need:</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">My Experiences</p>
                  <p className="text-sm text-gray-600">
                    All your personal learning journeys, onboarding plans, and assigned content
                  </p>
                  <Link to={createPageUrl('MyExperiences')}>
                    <Button size="sm" variant="link" className="px-0 text-blue-600">
                      Go to My Experiences
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Team Experiences</p>
                  <p className="text-sm text-gray-600">
                    Monitor your direct reports' learning progress and development
                  </p>
                  <Link to={createPageUrl('TeamExperiences')}>
                    <Button size="sm" variant="link" className="px-0 text-blue-600">
                      Go to Team Experiences
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Experience Management</p>
                  <p className="text-sm text-gray-600">
                    Create, deploy, and manage organizational learning experiences
                  </p>
                  <Link to={createPageUrl('ExperienceManagement')}>
                    <Button size="sm" variant="link" className="px-0 text-blue-600">
                      Go to Experience Management
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            What's New?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Badge className="bg-green-100 text-green-800">New</Badge>
              <span>Dropdown navigation under "Experiences" for better organization</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge className="bg-green-100 text-green-800">New</Badge>
              <span>Breadcrumb navigation in all builder tools</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge className="bg-green-100 text-green-800">New</Badge>
              <span>Context-aware headers for each section</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge className="bg-green-100 text-green-800">New</Badge>
              <span>Requests integrated into Experience Management</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge className="bg-blue-100 text-blue-800">Improved</Badge>
              <span>Clear visual hierarchy with distinct icons for each section</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}