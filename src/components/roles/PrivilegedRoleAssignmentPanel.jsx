import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Crown, Sparkles, AlertCircle, UserCog } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const PRIVILEGED_OPERATOR_EMAIL = "team@curiosityled.com";

const PRIVILEGED_ROLES = [
  {
    id: "Super Administrator",
    title: "Super Administrator",
    description: "Organization-level super administrator",
    icon: Crown,
  },
  {
    id: "Partner Business Administrator",
    title: "Partner Business Administrator",
    description: "Partner-level administration and client management",
    icon: Sparkles,
  },
  {
    id: "Platform Admin",
    title: "Platform Administrator",
    description: "Curiosity Led staff — full platform access",
    icon: Shield,
  },
];

export default function PrivilegedRoleAssignmentPanel({ currentUserEmail }) {
  const [targetEmail, setTargetEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Only the privileged operator email may see this panel.
  if (currentUserEmail !== PRIVILEGED_OPERATOR_EMAIL) {
    return null;
  }

  const handleAssign = async () => {
    if (!targetEmail.trim() || !selectedRole) {
      toast.error("Enter a target email and select a privileged role.");
      return;
    }
    setAssigning(true);
    try {
      const response = await base44.functions.invoke("assignPrivilegedRole", {
        targetEmail: targetEmail.trim().toLowerCase(),
        newRole: selectedRole,
      });
      const result = response?.data ?? response;
      if (result?.success) {
        toast.success(result.message || `Assigned ${selectedRole} to ${targetEmail}`);
        setTargetEmail("");
        setSelectedRole("");
      } else {
        toast.error(result?.error || "Failed to assign role");
      }
    } catch (error) {
      const errorMsg = error?.data?.error || error?.message || "Failed to assign role";
      toast.error(errorMsg);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="shadow-xl border-0 border-t-4 border-t-purple-600">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserCog className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <CardTitle>Privileged Role Assignment</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Restricted to {PRIVILEGED_OPERATOR_EMAIL}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Tight Control</p>
                <p className="text-xs text-amber-800 mt-1">
                  Only {PRIVILEGED_OPERATOR_EMAIL} can assign Super Administrator,
                  Partner Business Administrator, or Platform Admin roles. Every
                  assignment is audit-logged.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Target user email
            </label>
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="e.g. jane@acme.com"
              className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Privileged role to assign
            </label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a privileged role" />
              </SelectTrigger>
              <SelectContent>
                {PRIVILEGED_ROLES.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      <role.icon className="h-4 w-4 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">{role.title}</span>
                        <span className="text-xs text-gray-500">{role.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAssign}
            disabled={assigning || !targetEmail.trim() || !selectedRole}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
          >
            {assigning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Assigning Role...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Assign Privileged Role
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}