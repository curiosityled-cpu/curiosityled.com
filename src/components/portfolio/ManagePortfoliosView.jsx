import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, Briefcase, Lock } from "lucide-react";
import PortfolioAssignmentManager from "./PortfolioAssignmentManager";
import PortfolioDelegationManager from "./PortfolioDelegationManager";

const HR_ADMIN_ROLES = ["Admin Level 2", "Super Administrator", "Platform Admin", "Partner Business Administrator"];

/**
 * "Manage Portfolios" tab content — role-dependent.
 *  - HRBP: read-only list of their own portfolio assignments + self-delegation form.
 *  - HR Admin: full admin form (create/edit assignments for any HRBP) + delegation management.
 */
export default function ManagePortfoliosView({ appRole }) {
  const { user } = useAuth();
  const isAdmin = HR_ADMIN_ROLES.includes(appRole);

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <PortfolioAssignmentManager />
        <PortfolioDelegationManager />
      </div>
    );
  }

  return <HRBPManagePortfolios userEmail={user?.email} />;
}

/** HRBP self-view: read-only assignments + self-delegation. */
function HRBPManagePortfolios({ userEmail }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const list = await base44.entities.HRBPPortfolio
        .filter({ hrbp_email: userEmail })
        .catch(() => []);
      setAssignments(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [userEmail]);

  const scopeDetail = (a) => {
    if (a.assignment_type === "explicit")
      return `${a.manager_emails?.length || 0} explicit manager${(a.manager_emails?.length || 0) !== 1 ? "s" : ""}`;
    if (a.assignment_type === "business_unit")
      return [a.business_unit, a.department, a.team].filter(Boolean).join(" · ") || "BU scope";
    if (a.assignment_type === "client") return "Whole client org";
    return "—";
  };

  const TypeIcon = ({ type }) =>
    type === "client" ? (
      <Briefcase className="w-4 h-4" />
    ) : type === "explicit" ? (
      <Users className="w-4 h-4" />
    ) : (
      <Building2 className="w-4 h-4" />
    );

  return (
    <div className="space-y-6">
      {/* Read-only assignment list */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              My Portfolio Assignments
            </h3>
            <Badge variant="outline" className="text-[10px] text-gray-400">
              read-only
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            These assignments are managed by your HR administrator. To request changes, contact them directly.
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No portfolio assignments yet.
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0202ff]/10 flex items-center justify-center text-[#0202ff] flex-shrink-0">
                    <TypeIcon type={a.assignment_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.label}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {a.assignment_type.replace("_", " ")}
                      </Badge>
                      {a.status === "inactive" && (
                        <Badge variant="outline" className="text-[10px] text-gray-400">
                          inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{scopeDetail(a)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Self-delegation */}
      <PortfolioDelegationManager />
    </div>
  );
}