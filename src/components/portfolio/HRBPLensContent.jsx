import React, { useState } from "react";
import PortfolioHealthView from "./PortfolioHealthView";
import ManagePortfoliosView from "./ManagePortfoliosView";

const HR_ADMIN_ROLES = ["Admin Level 2", "Super Administrator", "Platform Admin", "Partner Business Administrator"];

/**
 * The HRBP lens content for the Leadership Intelligence Hub.
 * Owns the Portfolio Health / Manage Portfolios toggle and renders the
 * role-dependent views. Tab labels differ for HRBP vs HR Administrator.
 */
export default function HRBPLensContent({ appRole }) {
  const [tab, setTab] = useState("health");
  const isAdmin = HR_ADMIN_ROLES.includes(appRole);

  const tabs = isAdmin
    ? [
        { id: "health", label: "HRBP Portfolio Health" },
        { id: "manage", label: "Manage HRBP Portfolios" },
      ]
    : [
        { id: "health", label: "Portfolio Health" },
        { id: "manage", label: "Manage Portfolios" },
      ];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all select-none ${
              tab === t.id ? "bg-[#0202ff] text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "health" ? (
        <PortfolioHealthView appRole={appRole} />
      ) : (
        <ManagePortfoliosView appRole={appRole} />
      )}
    </div>
  );
}