import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, FileText as FileTextIcon, FileDown } from "lucide-react";
import { motion } from "framer-motion";

export default function PageHeader({ 
  title, 
  subtitle, 
  badges = [],
  onRefresh, 
  onExportCSV, 
  onExportPDF,
  loadingRefresh = false,
  loadingExportCSV = false,
  loadingExportPDF = false,
  headerColor = '#0201ff',
  rightContent = null,
  additionalHeaderContent = null
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <Card className="border-0 shadow-xl text-white" style={{ backgroundColor: headerColor }}>
        <CardContent className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{title}</h1>
              <p className="opacity-90 text-sm sm:text-base">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {additionalHeaderContent}
              {badges.map((badge, index) => (
                <Badge key={index} className={badge.className} style={badge.style || { backgroundColor: 'white', color: '#A25DDC' }}>
                  {badge.text}
                </Badge>
              ))}
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  title="Refresh data"
                  disabled={loadingRefresh}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingRefresh ? 'animate-spin' : ''}`} />
                </Button>
              )}
              {onExportCSV && (
                <Button
                  onClick={onExportCSV}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  title="Export to CSV"
                  disabled={loadingExportCSV}
                >
                  <FileTextIcon className={`w-4 h-4 ${loadingExportCSV ? 'animate-spin' : ''}`} />
                </Button>
              )}
              {onExportPDF && (
                <Button
                  onClick={onExportPDF}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  title="Export to PDF"
                  disabled={loadingExportPDF}
                >
                  <FileDown className={`w-4 h-4 ${loadingExportPDF ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
          {rightContent && (
            <div className="mt-4 flex justify-end">
              {rightContent}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}