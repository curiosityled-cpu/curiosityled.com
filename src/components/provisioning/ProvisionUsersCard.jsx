import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserPlus, Upload, Shield } from "lucide-react";
import ProvisioningWizard from "./ProvisioningWizard";

/**
 * Card shown on the User Management page that launches the unified
 * provisioning wizard (single user + CSV batch, with role-scoped picker).
 */
export default function ProvisionUsersCard({ currentUser, onProvisioned }) {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <>
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#0202ff10" }}>
                <Users className="w-5 h-5" style={{ color: "#0202ff" }} />
              </div>
              <div>
                <CardTitle className="text-base">Provision Users</CardTitle>
                <CardDescription className="text-sm">
                  Add a person or upload a CSV — roles scoped to your level.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex gap-2 pt-0">
          <Button size="sm" onClick={() => setWizardOpen(true)} style={{ backgroundColor: "#0202ff" }} className="hover:opacity-90">
            <UserPlus className="w-4 h-4 mr-2" /> Provision Users
          </Button>
        </CardContent>
      </Card>

      <ProvisioningWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        currentUser={currentUser}
        onSuccess={onProvisioned}
      />
    </>
  );
}