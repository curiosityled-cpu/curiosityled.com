import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// HealthCo client ID from the database
const HEALTHCO_CLIENT_ID = "69288bdf83f3f8692d22a958";
const PARTNER_SERVICES_ID = "69288b0e956aa226c26ea1a1";

// Addon role IDs
const HR_ADMIN_ADDON_ID = "692506b869ec606f4b7b9e0f";
const ANALYST_ADDON_ID = "692506b869ec606f4b7b9e0d";

// User configurations from the image
const HEALTHCO_USERS = [
    { email: "alex.rivera@healthco.com", full_name: "Alex Rivera", app_role: "User Level 1", current_role: "Sales Manager", department: "Sales", sector: "Healthcare", manager_email: "tyler.chen@healthco.com", start_date: "2024-03-11", client_id: HEALTHCO_CLIENT_ID },
    { email: "marisa.trent@healthco.com", full_name: "Marisa Trent", app_role: "User Level 1", current_role: "Account Manager", department: "Sales", sector: "Healthcare", manager_email: "tyler.chen@healthco.com", start_date: "2023-11-06", client_id: HEALTHCO_CLIENT_ID },
    { email: "tyler.chen@healthco.com", full_name: "Tyler Chen", app_role: "User Level 2", current_role: "Director of Sales Operations", department: "Sales", sector: "Healthcare", manager_email: "vp.sales@healthco.com", start_date: "2023-01-05", client_id: HEALTHCO_CLIENT_ID },
    { email: "lena.hart@healthco.com", full_name: "Lena Hart", app_role: "User Level 1", current_role: "Marketing Manager", department: "Marketing", sector: "Healthcare", manager_email: "sophia.klein@healthco.com", start_date: "2024-02-19", client_id: HEALTHCO_CLIENT_ID },
    { email: "andre.palmer@healthco.com", full_name: "Andre Palmer", app_role: "User Level 1", current_role: "Campaign Manager", department: "Marketing", sector: "Healthcare", manager_email: "sophia.klein@healthco.com", start_date: "2023-12-04", client_id: HEALTHCO_CLIENT_ID },
    { email: "sophia.klein@healthco.com", full_name: "Sophia Klein", app_role: "User Level 2", current_role: "Director of Brand Strategy", department: "Marketing", sector: "Healthcare", manager_email: "vp.marketing@healthco.com", start_date: "2024-03-01", client_id: HEALTHCO_CLIENT_ID },
    { email: "matt.garza@healthco.com", full_name: "Matt Garza", app_role: "User Level 1", current_role: "Operations Manager", department: "Operations", sector: "Healthcare", manager_email: "cory.santos@healthco.com", start_date: "2024-01-08", client_id: HEALTHCO_CLIENT_ID },
    { email: "jillian.price@healthco.com", full_name: "Jillian Price", app_role: "User Level 1", current_role: "Service Delivery Manager", department: "Operations", sector: "Healthcare", manager_email: "cory.santos@healthco.com", start_date: "2024-03-08", client_id: HEALTHCO_CLIENT_ID },
    { email: "cory.santos@healthco.com", full_name: "Cory Santos", app_role: "User Level 2", current_role: "Director of Clinical Operations", department: "Operations", sector: "Healthcare", manager_email: "svp.operations@healthco.com", start_date: "2024-02-05", client_id: HEALTHCO_CLIENT_ID },
    { email: "daniel.kim@healthco.com", full_name: "Daniel Kim", app_role: "User Level 1", current_role: "Engineering Manager", department: "Engineering", sector: "Healthcare", manager_email: "omar.west@healthco.com", start_date: "2024-03-04", client_id: HEALTHCO_CLIENT_ID },
    { email: "rebecca.lopez@healthco.com", full_name: "Rebecca Lopez", app_role: "User Level 1", current_role: "Software Manager", department: "Engineering", sector: "Healthcare", manager_email: "omar.west@healthco.com", start_date: "2024-09-25", client_id: HEALTHCO_CLIENT_ID },
    { email: "omar.west@healthco.com", full_name: "Omar West", app_role: "User Level 2", current_role: "Director of Platform Engineering", department: "Engineering", sector: "Healthcare", manager_email: "cto@healthco.com", start_date: "2024-01-22", client_id: HEALTHCO_CLIENT_ID },
    { email: "carla.mendez@healthco.com", full_name: "Carla Mendez", app_role: "User Level 1", current_role: "Finance Manager", department: "Finance", sector: "Healthcare", manager_email: "nina.bryant@healthco.com", start_date: "2024-02-12", client_id: HEALTHCO_CLIENT_ID },
    { email: "ryan.douglas@healthco.com", full_name: "Ryan Douglas", app_role: "User Level 1", current_role: "Billing Manager", department: "Finance", sector: "Healthcare", manager_email: "vp.finance@healthco.com", start_date: "2024-03-18", client_id: HEALTHCO_CLIENT_ID },
    { email: "nina.bryant@healthco.com", full_name: "Nina Bryant", app_role: "User Level 2", current_role: "Director of Revenue Cycle", department: "Finance", sector: "Healthcare", manager_email: "vp.finance@healthco.com", start_date: "2024-02-01", client_id: HEALTHCO_CLIENT_ID },
    { email: "talia.gomez@healthco.com", full_name: "Talia Gomez", app_role: "User Level 1", current_role: "HR Manager", department: "HR", sector: "Healthcare", manager_email: "elise.warren@healthco.com", start_date: "2024-01-02", client_id: HEALTHCO_CLIENT_ID, custom_role_id: HR_ADMIN_ADDON_ID },
    { email: "mark.reynolds@healthco.com", full_name: "Mark Reynolds", app_role: "User Level 1", current_role: "Talent Acquisition Manager", department: "HR", sector: "Healthcare", manager_email: "cpo.admin@healthco.com", start_date: "2024-02-26", client_id: HEALTHCO_CLIENT_ID },
    { email: "elise.warren@healthco.com", full_name: "Elise Warren", app_role: "User Level 2", current_role: "Director of HR", department: "HR", sector: "Healthcare", manager_email: "cpo.admin@healthco.com", start_date: "2023-08-15", client_id: HEALTHCO_CLIENT_ID, custom_role_id: HR_ADMIN_ADDON_ID },
    { email: "david.patel@healthco.com", full_name: "David Patel", app_role: "Analyst", current_role: "People Analytics Specialist", department: "People Analytics", sector: "Healthcare", manager_email: "super.admin@healthco.com", start_date: "2024-01-15", client_id: HEALTHCO_CLIENT_ID },
    { email: "shannon.brooks@healthco.com", full_name: "Shannon Brooks", app_role: "Admin Level 1", current_role: "Program Administrator", department: "L&D", sector: "Healthcare", manager_email: "super.admin@healthco.com", start_date: "2023-09-18", client_id: HEALTHCO_CLIENT_ID },
    { email: "jordan.fields@healthco.com", full_name: "Jordan Fields", app_role: "Admin Level 2", current_role: "HR Administrator", department: "HR", sector: "Healthcare", manager_email: "super.admin@healthco.com", start_date: "2023-10-05", client_id: HEALTHCO_CLIENT_ID, custom_role_id: HR_ADMIN_ADDON_ID },
    { email: "cpo.admin@healthco.com", full_name: "Karen Miles", app_role: "User Level 2", current_role: "Chief People Officer", department: "Executive", sector: "Healthcare", manager_email: "ceo@healthco.com", start_date: "2024-02-12", client_id: HEALTHCO_CLIENT_ID, custom_role_id: HR_ADMIN_ADDON_ID },
    { email: "vp.sales@healthco.com", full_name: "Bill Pliskin", app_role: "User Level 2", current_role: "VP of Sales", department: "Sales", sector: "Healthcare", manager_email: "ceo@healthco.com", start_date: "2024-09-18", client_id: HEALTHCO_CLIENT_ID, custom_role_id: ANALYST_ADDON_ID },
    { email: "svp.operations@healthco.com", full_name: "Mark Milumfrey", app_role: "User Level 2", current_role: "SVP of Operations", department: "Operations", sector: "Healthcare", manager_email: "ceo@healthco.com", start_date: "2024-03-10", client_id: HEALTHCO_CLIENT_ID, custom_role_id: ANALYST_ADDON_ID },
    { email: "cto@healthco.com", full_name: "Stephen Cobalt", app_role: "User Level 2", current_role: "Chief Technology Officer", department: "Engineering", sector: "Healthcare", manager_email: "ceo@healthco.com", start_date: "2024-10-01", client_id: HEALTHCO_CLIENT_ID, custom_role_id: ANALYST_ADDON_ID },
    { email: "vp.finance@healthco.com", full_name: "Tammy Pollard", app_role: "User Level 2", current_role: "VP of Finance", department: "Finance", sector: "Healthcare", manager_email: "ceo@healthco.com", start_date: "2023-11-08", client_id: HEALTHCO_CLIENT_ID, custom_role_id: ANALYST_ADDON_ID },
    { email: "ceo@healthco.com", full_name: "Dominic West", app_role: "User Level 2", current_role: "Chief Executive Officer", department: "Executive", sector: "Healthcare", manager_email: "elise.warren@healthco.com", start_date: "2023-11-08", client_id: HEALTHCO_CLIENT_ID, custom_role_id: ANALYST_ADDON_ID },
    { email: "super.admin@healthco.com", full_name: "Maria Toni", app_role: "Super Administrator", current_role: "Talent Management Manager", department: "HR", sector: "Healthcare", manager_email: "elise.warren@healthco.com", start_date: "2023-08-14", client_id: HEALTHCO_CLIENT_ID },
    { email: "partner.admin@partnerservices.com", full_name: "Blake Donovan", app_role: "Partner Business Administrator", current_role: "Partner Business Administrator", department: "Consulting", sector: "Healthcare", manager_email: "partner.director@partnerservices.com", start_date: "2023-08-14", partner_id: PARTNER_SERVICES_ID }
];

export default function ConfigureHealthCoUsers() {
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState(null);

    const handleConfigure = async () => {
        setProcessing(true);
        setResults(null);
        
        try {
            const response = await base44.functions.invoke('configureUsers', {
                users: HEALTHCO_USERS
            });
            
            const data = response?.data || response;
            setResults(data);
            
            if (data.success) {
                toast.success(`Configured ${data.summary.updated} users successfully!`);
                if (data.summary.notFound > 0) {
                    toast.warning(`${data.summary.notFound} users were not found in the system.`);
                }
            } else {
                toast.error(data.error || 'Configuration failed');
            }
        } catch (error) {
            console.error('Error configuring users:', error);
            toast.error('Failed to configure users: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Play className="w-5 h-5" />
                            Configure HealthCo Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert className="border-blue-200 bg-blue-50">
                            <AlertCircle className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-900">
                                This will configure {HEALTHCO_USERS.length} users with their profile information including:
                                <ul className="list-disc list-inside mt-2 text-sm">
                                    <li>App role (User Level 1, User Level 2, Analyst, Admin, etc.)</li>
                                    <li>Current job title and department</li>
                                    <li>Manager email for hierarchy</li>
                                    <li>Client/Partner organization assignment</li>
                                    <li>Addon roles (HR Admin, Analyst)</li>
                                </ul>
                            </AlertDescription>
                        </Alert>

                        <div className="border rounded-lg p-4 bg-gray-50">
                            <h3 className="font-medium mb-3">Users to Configure:</h3>
                            <div className="grid gap-2 max-h-64 overflow-y-auto">
                                {HEALTHCO_USERS.map((user, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{user.full_name}</span>
                                            <span className="text-gray-500">({user.email})</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className="text-xs">{user.app_role}</Badge>
                                            <Badge className="bg-gray-100 text-gray-700 text-xs">{user.department}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button 
                            onClick={handleConfigure} 
                            disabled={processing}
                            className="w-full"
                            size="lg"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Configuring Users...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Configure All {HEALTHCO_USERS.length} Users
                                </>
                            )}
                        </Button>

                        {results && (
                            <div className="space-y-4 mt-6">
                                <Alert className={results.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                                    <AlertDescription>
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium">Results:</span>
                                            <Badge className="bg-green-100 text-green-800">{results.summary?.updated || 0} Updated</Badge>
                                            <Badge className="bg-yellow-100 text-yellow-800">{results.summary?.notFound || 0} Not Found</Badge>
                                            <Badge className="bg-red-100 text-red-800">{results.summary?.failed || 0} Failed</Badge>
                                        </div>
                                    </AlertDescription>
                                </Alert>

                                {results.updated?.length > 0 && (
                                    <div className="border rounded-lg p-4">
                                        <h4 className="font-medium text-green-700 mb-2">Successfully Updated:</h4>
                                        <div className="grid gap-1 text-sm max-h-32 overflow-y-auto">
                                            {results.updated.map((u, i) => (
                                                <div key={i} className="text-green-600">✓ {u.email}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {results.notFound?.length > 0 && (
                                    <div className="border rounded-lg p-4 border-yellow-200 bg-yellow-50">
                                        <h4 className="font-medium text-yellow-700 mb-2">Not Found (need to invite via dashboard):</h4>
                                        <div className="grid gap-1 text-sm max-h-32 overflow-y-auto">
                                            {results.notFound.map((u, i) => (
                                                <div key={i} className="text-yellow-700">⚠ {u.user?.email}: {u.reason}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {results.failed?.length > 0 && (
                                    <div className="border rounded-lg p-4 border-red-200 bg-red-50">
                                        <h4 className="font-medium text-red-700 mb-2">Failed:</h4>
                                        <div className="grid gap-1 text-sm max-h-32 overflow-y-auto">
                                            {results.failed.map((u, i) => (
                                                <div key={i} className="text-red-600">✗ {u.user?.email}: {u.reason}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}