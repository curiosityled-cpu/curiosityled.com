import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function DivisionPerformanceTable({ divisions, onDivisionClick, onCellClick }) {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Division Leadership Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700">Division</th>
                <th className="text-center p-3 font-semibold text-gray-700">Leaders</th>
                <th className="text-center p-3 font-semibold text-gray-700">Score</th>
                <th className="text-center p-3 font-semibold text-gray-700">Ready</th>
                <th className="text-center p-3 font-semibold text-gray-700">HiPo</th>
                <th className="text-center p-3 font-semibold text-gray-700">At Risk</th>
                <th className="text-center p-3 font-semibold text-gray-700">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {divisions && divisions.length > 0 ? (
                divisions.map((div, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td 
                      className="p-3 font-medium text-blue-600 cursor-pointer hover:underline"
                      onClick={() => onDivisionClick && onDivisionClick(div)}
                    >
                      {div.name}
                    </td>
                    <td className="p-3 text-center text-gray-700">{div.leaders.length}</td>
                    <td className="p-3 text-center">
                      <Badge className={getScoreBadge(div.avgScore)}>
                        {div.avgScore}%
                      </Badge>
                    </td>
                    <td 
                      className="p-3 text-center cursor-pointer hover:bg-blue-100"
                      onClick={() => onCellClick && onCellClick(div, 'ready_now')}
                    >
                      <span className="text-green-600 font-semibold">{div.ready_now || 0}</span>
                    </td>
                    <td 
                      className="p-3 text-center cursor-pointer hover:bg-blue-100"
                      onClick={() => onCellClick && onCellClick(div, 'high_potential')}
                    >
                      <span className="text-blue-600 font-semibold">{div.high_potential || 0}</span>
                    </td>
                    <td 
                      className="p-3 text-center cursor-pointer hover:bg-blue-100"
                      onClick={() => onCellClick && onCellClick(div, 'at_risk')}
                    >
                      <span className="text-red-600 font-semibold">{div.at_risk || 0}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={getScoreColor(div.avgScore)}>
                        {div.avgScore >= 75 ? (
                          <TrendingUp className="w-4 h-4 inline" />
                        ) : (
                          <TrendingDown className="w-4 h-4 inline" />
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    No division data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}