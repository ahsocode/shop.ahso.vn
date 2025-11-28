"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Activity } from "lucide-react";

type Period = "day" | "week" | "month" | "year";

type RevenueStats = {
  total: number;
  profit: number;
  cost: number;
};

type SummaryStats = {
  ordersCompleted: number;
  productsSold: number;
};

type DashboardStats = {
  revenue: RevenueStats;
  netProfit: number;
  summary: SummaryStats;
};

type TransactionType = "INCOME" | "REFUND" | "EXPENSE" | string;

type Transaction = {
  id: string;
  code: string;
  type: TransactionType;
  orderCode?: string | null;
  customerName?: string | null;
  amount: number;
  profitAmount: number;
  createdAt: string;
};

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("month");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txPage] = useState(1);

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/staff/statistics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("Stats request failed:", res.status, res.statusText);
        setStats(null);
        return;
      }
      const text = await res.text();
      try {
        const data = JSON.parse(text) as DashboardStats;
        setStats(data);
      } catch (err) {
        console.error("Stats response is not JSON:", err, text.slice(0, 200));
        setStats(null);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  const fetchTransactions = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/staff/transactions?page=${txPage}&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("Transactions request failed:", res.status, res.statusText);
        setTransactions([]);
        return;
      }
      const text = await res.text();
      try {
        const data = JSON.parse(text) as { data?: Transaction[] };
        setTransactions(data.data || []);
      } catch (err) {
        console.error("Transactions response is not JSON:", err, text.slice(0, 200));
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }, [txPage]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    trend,
  }: {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    trend?: number;
  }) => (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Tổng quan kinh doanh</p>
          </div>
          
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="day">Hôm nay</option>
            <option value="week">7 ngày qua</option>
            <option value="month">Tháng này</option>
            <option value="year">Năm này</option>
          </select>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Tổng doanh thu"
              value={formatCurrency(stats.revenue.total)}
              icon={DollarSign}
              color="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <StatCard
              title="Lợi nhuận"
              value={formatCurrency(stats.revenue.profit)}
              icon={TrendingUp}
              color="bg-gradient-to-br from-green-500 to-green-600"
            />
            <StatCard
              title="Đơn hàng"
              value={stats.summary.ordersCompleted || 0}
              icon={ShoppingCart}
              color="bg-gradient-to-br from-purple-500 to-purple-600"
            />
            <StatCard
              title="Sản phẩm bán"
              value={stats.summary.productsSold || 0}
              icon={Package}
              color="bg-gradient-to-br from-orange-500 to-orange-600"
            />
          </div>
        )}

        {/* Profit Analysis */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Giá vốn</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.revenue.cost)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Tỷ suất lợi nhuận</h3>
              <p className="text-2xl font-bold text-green-600">
                {stats.revenue.total > 0 
                  ? ((stats.revenue.profit / stats.revenue.total) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Lãi ròng</h3>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.netProfit)}
              </p>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Giao dịch gần đây</h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã GD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã đơn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Khách hàng
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số tiền
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lãi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tx.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tx.type === 'INCOME' 
                          ? 'bg-green-100 text-green-800'
                          : tx.type === 'REFUND'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {tx.type === 'INCOME' ? 'Thu' : tx.type === 'REFUND' ? 'Hoàn' : 'Chi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.orderCode || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.customerName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      tx.profitAmount > 0 ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {tx.profitAmount > 0 ? formatCurrency(tx.profitAmount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              Chưa có giao dịch nào
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
