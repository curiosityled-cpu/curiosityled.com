import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, FileDown, Loader2 } from "lucide-react";
import SubNavMenu from "./SubNavMenu";

export default function DashboardHeader({
  title,
  subtitle,
  roleDisplayName,
  badges = [],
  availableViews = [],
  currentView,
  onViewChange,
  onRefresh,
  onExportCSV,
  onExportPDF,
  isRefreshing,
  exportingCSV,
  exportingPDF
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-xl p-4 sm:p-6 text-white shadow-lg"
      style={{ backgroundColor: '#0201ff' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
          <p className="mt-1 sm:mt-2 text-blue-100 text-sm sm:text-base">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {availableViews.length > 1 && (
            <SubNavMenu
              items={availableViews}
              activeId={currentView}
              onItemClick={onViewChange}
            />
          )}
          <Badge className="bg-white text-purple-600 hover:bg-white/90">
            {roleDisplayName}
          </Badge>
          {badges.map((badge, index) => (
            <Badge key={index} className="bg-white text-gray-800 hover:bg-white/90">
              {badge.text}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            title="Refresh data"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            title="Export to CSV"
            onClick={onExportCSV}
            disabled={exportingCSV}
          >
            {exportingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            title="Export to PDF"
            onClick={onExportPDF}
            disabled={exportingPDF}
          >
            {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}