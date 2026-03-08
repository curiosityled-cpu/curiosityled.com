import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, TrendingUp, TrendingDown, Gift, Award, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";

export default function PointHistoryTimeline({ userEmail = null, maxItems = 20 }) {
  const { user } = useAuth();
  const targetEmail = userEmail || user?.email;
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [targetEmail]);

  const loadHistory = async () => {
    if (!targetEmail) return;

    try {
      const history = await base44.entities.PointTransaction.filter({
        user_email: targetEmail
      }, '-created_date', maxItems);

      setTransactions(history);
    } catch (error) {
      console.error("Error loading point history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'peer_recognition':
        return <Gift className="w-4 h-4 text-blue-600" />;
      case 'manager_award':
        return <Award className="w-4 h-4 text-purple-600" />;
      case 'earned_activity':
        return <Zap className="w-4 h-4 text-green-600" />;
      case 'system_award':
        return <TrendingUp className="w-4 h-4 text-orange-600" />;
      case 'deduction':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type) => {
    switch(type) {
      case 'peer_recognition':
        return 'border-blue-200 bg-blue-50';
      case 'manager_award':
        return 'border-purple-200 bg-purple-50';
      case 'earned_activity':
        return 'border-green-200 bg-green-50';
      case 'system_award':
        return 'border-orange-200 bg-orange-50';
      case 'deduction':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          Point History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No point history yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative border-l-4 pl-4 py-2 ${getTransactionColor(transaction.transaction_type)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="mt-0.5">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.reason || 'Points earned'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {transaction.transaction_type.replace('_', ' ')}
                        </Badge>
                        {transaction.given_by_email && transaction.given_by_email !== 'system' && (
                          <span className="text-xs text-gray-500">
                            from {transaction.given_by_email}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(transaction.created_date)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${
                      transaction.points_amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.points_amount > 0 ? '+' : ''}{transaction.points_amount}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}