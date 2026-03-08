import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CheckCircle, AlertCircle, Lock } from "lucide-react";

export default function LoginHistoryChart({ loginHistory }) {
  // Group by day for trend chart
  const dailyStats = loginHistory.reduce((acc, login) => {
    const date = new Date(login.login_timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, success: 0, failed: 0, locked: 0 };
    }
    acc[date][login.status]++;
    return acc;
  }, {});

  const trendData = Object.values(dailyStats).slice(-7); // Last 7 days

  // Status distribution
  const statusData = [
    { name: 'Successful', value: loginHistory.filter(l => l.status === 'success').length, color: '#10b981' },
    { name: 'Failed', value: loginHistory.filter(l => l.status === 'failed').length, color: '#f59e0b' },
    { name: 'Locked', value: loginHistory.filter(l => l.status === 'locked').length, color: '#ef4444' }
  ].filter(item => item.value > 0);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Login Trend (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Bar dataKey="success" fill="#10b981" name="Success" />
              <Bar dataKey="failed" fill="#f59e0b" name="Failed" />
              <Bar dataKey="locked" fill="#ef4444" name="Locked" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Login Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}