import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function IndustryPerformanceTable({ data, onRowClick }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Industry Leadership Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No industry data available</p>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => b.avgSI - a.avgSI);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Industry Leadership Performance
        </CardTitle>
        <p className="text-sm text-gray-500">Aggregated performance by industry sector</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Industry</TableHead>
              <TableHead className="text-center">Leaders</TableHead>
              <TableHead className="text-center">Avg SI</TableHead>
              <TableHead className="text-center">Ready Now</TableHead>
              <TableHead className="text-center">High Potential</TableHead>
              <TableHead className="text-center">At Risk</TableHead>
              <TableHead className="text-center">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row, index) => (
              <TableRow 
                key={row.industry}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onRowClick?.(row)}
              >
                <TableCell className="font-medium">{row.industry}</TableCell>
                <TableCell className="text-center">{row.totalLeaders}</TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline"
                    className={
                      row.avgSI >= 70 ? 'border-green-500 text-green-700' :
                      row.avgSI >= 50 ? 'border-amber-500 text-amber-700' :
                      'border-red-500 text-red-700'
                    }
                  >
                    {row.avgSI}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-green-600 font-medium">{row.readyNowPct}%</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-amber-600 font-medium">{row.highPotentialPct}%</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-red-600 font-medium">{row.atRiskPct}%</span>
                </TableCell>
                <TableCell className="text-center">
                  {row.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-600 mx-auto" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600 mx-auto" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}