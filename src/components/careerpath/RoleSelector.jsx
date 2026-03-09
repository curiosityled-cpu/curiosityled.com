import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowRight, Sparkles, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

export default function RoleSelector({ 
    currentUserRole, 
    roles, 
    careerPaths, 
    selectedRole, 
    onRoleSelect 
}) {
    
    const getPathRelationship = (role) => {
        if (!currentUserRole || !role) return null;
        
        const path = careerPaths.find(p => 
            p.from_role_id === currentUserRole && 
            p.to_role_id === role.title
        );
        
        if (!path) return { type: 'none', label: 'New Opportunity', color: 'bg-gray-100 text-gray-800', icon: Sparkles };
        
        if (path.path_type === 'vertical') {
            return { type: 'vertical', label: 'Promotion', color: 'bg-green-100 text-green-800', icon: ArrowUp };
        }
        
        return { type: 'lateral', label: 'Lateral Move', color: 'bg-blue-100 text-blue-800', icon: ArrowRight };
    };

    return (
        <Card className="shadow-lg border-0 h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    Explore Career Opportunities
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current Role Display */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600 font-medium mb-1">Your Current Role</p>
                    <p className="text-lg font-semibold text-blue-900">
                        {currentUserRole || "Not Set"}
                    </p>
                    {!currentUserRole && (
                        <p className="text-xs text-blue-600 mt-1">
                            Update your profile to see personalized recommendations
                        </p>
                    )}
                </div>

                {/* All Available Roles */}
                <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Explore All Roles ({roles.length})</h4>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {roles.map((role, index) => {
                            const relationship = getPathRelationship(role);
                            const RelationIcon = relationship?.icon;
                            
                            return (
                                <motion.div
                                    key={role.id || role.title}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <div
                                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                            selectedRole?.title === role.title 
                                                ? 'border-blue-300 bg-blue-50 shadow-sm' 
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => onRoleSelect(role)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <h5 className="font-medium text-gray-900">{role.title}</h5>
                                                <p className="text-sm text-gray-600">{role.department}</p>
                                            </div>
                                            {relationship && (
                                                <Badge className={`${relationship.color} flex items-center gap-1`}>
                                                    <RelationIcon className="w-3 h-3" />
                                                    {relationship.label}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <Badge variant="outline" className="text-xs">
                                                {role.level?.replace('_', ' ')}
                                            </Badge>
                                            {role.typical_experience_years && (
                                                <span className="text-gray-500">
                                                    {role.typical_experience_years}+ years
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}