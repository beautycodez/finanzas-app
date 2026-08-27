"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useDateFilter } from "@/lib/dateFilter";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface CategoryTotal {
  name: string;
  total: number;
  color: string;
}

interface MonthData {
  month: string;
  income: number;
  expense: number;
}

interface TopExpense {
  description: string;
  amount: number;
  category: string;
  date: string;
  color: string;
}

export default function ReportsPage() {
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryTotal[]>([]);
  const [categoryIncome, setCategoryIncome] = useState<CategoryTotal[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthData[]>([]);
  const [topExpenses, setTopExpenses] = useState<TopExpense[]>([]);
  const [stats, setStats] = useState({
    savingsRate: 0,
    dailyAvg: 0,
    monthChange: 0,
    totalIncome: 0,
    totalExpenses: 0,
    daysWithExpenses: 0,
  });
  const [loading, setLoading] = useState(true);
  const { from, to } = useDateFilter();

  useEffect(() => {
    loadReports();
  }, [from, to]);

  async function loadReports() {
    setLoading(true);

    const [currTxns, monthlyTxns, topTxns] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount, type, transaction_date, categories(name, color)")
        .gte("transaction_date", from)
        .lte("transaction_date", to),
      supabase
        .from("transactions")
        .select("amount, type, transaction_date, categories(name, color)")
        .gte("transaction_date", from)
        .order("transaction_date"),
      supabase
        .from("transactions")
        .select("amount, description, transaction_date, categories(name, color)")
        .eq("type", "expense")
        .gte("transaction_date", from)
        .lte("transaction_date", to)
        .order("amount", { ascending: false })
        .limit(5),
    ]);

    const curr = currTxns.data || [];
    const monthly = monthlyTxns.data || [];
    const top = topTxns.data || [];

    // Gastos por categoria
    const expMap: Record<string, { total: number; color: string }> = {};
    const incMap: Record<string, { total: number; color: string }> = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of curr) {
      const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
      const name = cat?.name || "Sin categoria";
      const color = cat?.color || "#94a3b8";

      if (t.type === "expense") {
        totalExpenses += t.amount;
        if (!expMap[name]) expMap[name] = { total: 0, color };
        expMap[name].total += t.amount;
      } else {
        totalIncome += t.amount;
        if (!incMap[name]) incMap[name] = { total: 0, color };
        incMap[name].total += t.amount;
      }
    }

    setCategoryExpenses(
      Object.entries(expMap)
        .map(([name, d]) => ({ name, total: d.total, color: d.color }))
        .sort((a, b) => b.total - a.total)
    );

    setCategoryIncome(
      Object.entries(incMap)
        .map(([name, d]) => ({ name, total: d.total, color: d.color }))
        .sort((a, b) => b.total - a.total)
    );

    // Tendencia mensual
    const monthMap: Record<string, { income: number; expense: number }> = {};
    for (const t of monthly) {
      const m = t.transaction_date.substring(0, 7);
      if (!monthMap[m]) monthMap[m] = { income: 0, expense: 0 };
      if (t.type === "income") monthMap[m].income += t.amount;
      else monthMap[m].expense += t.amount;
    }

    setMonthlyTrend(
      Object.entries(monthMap).map(([month, d]) => ({
        month,
        income: d.income,
        expense: d.expense,
      }))
    );

    // Top 5 gastos
    setTopExpenses(
      top.map((t) => {
        const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
        return {
          description: t.description || "Sin descripcion",
          amount: t.amount,
          category: cat?.name || "Sin categoria",
          date: t.transaction_date,
          color: cat?.color || "#94a3b8",
        };
      })
    );

    // Stats
    const uniqueDays = new Set(curr.filter((t) => t.type === "expense").map((t) => t.transaction_date)).size;
    const dailyAvg = uniqueDays > 0 ? totalExpenses / uniqueDays : 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    setStats({
      savingsRate,
      dailyAvg,
      monthChange: 0,
      totalIncome,
      totalExpenses,
      daysWithExpenses: uniqueDays,
    });

    setLoading(false);
  }

  function fmt(amount: number) {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 }).format(amount);
  }

  const dateLabel = from === to
    ? new Date(from + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : `${new Date(from + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })} — ${new Date(to + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Cargando reportes...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
        <p className="text-sm text-gray-500">{dateLabel}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Tasa de ahorro</p>
          <p className={`text-2xl font-bold ${stats.savingsRate >= 0 ? "text-green-600" : "text-red-600"}`}>
            {stats.savingsRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Gasto diario promedio</p>
          <p className="text-2xl font-bold text-gray-800">{fmt(stats.dailyAvg)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">vs mes anterior</p>
          <p className={`text-2xl font-bold ${stats.monthChange <= 0 ? "text-green-600" : "text-red-600"}`}>
            {stats.monthChange > 0 ? "+" : ""}{stats.monthChange.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Dias con gastos</p>
          <p className="text-2xl font-bold text-gray-800">{stats.daysWithExpenses}</p>
        </div>
      </div>

      {/* Gastos por categoria */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Gastos por categoria</h2>
        {categoryExpenses.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Sin gastos este mes</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryExpenses}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="total"
                  nameKey="name"
                  paddingAngle={2}
                >
                  {categoryExpenses.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 min-w-[180px]">
              {categoryExpenses.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-sm text-gray-700 truncate">{c.name}</span>
                  <span className="text-sm font-semibold text-gray-800 ml-auto">{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ingresos por categoria */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Ingresos por categoria</h2>
        {categoryIncome.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Sin ingresos este mes</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryIncome}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="total"
                  nameKey="name"
                  paddingAngle={2}
                >
                  {categoryIncome.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 min-w-[180px]">
              {categoryIncome.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-sm text-gray-700 truncate">{c.name}</span>
                  <span className="text-sm font-semibold text-gray-800 ml-auto">{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tendencia mensual */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Tendencia mensual</h2>
        {monthlyTrend.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrend}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend />
              <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top 5 gastos */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 5 gastos del mes</h2>
        {topExpenses.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Sin gastos</p>
        ) : (
          <div className="space-y-3">
            {topExpenses.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg font-bold text-gray-300 w-6 text-center">{i + 1}</span>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                  <p className="text-xs text-gray-500">{t.category} · {t.date}</p>
                </div>
                <p className="text-sm font-bold text-red-600 shrink-0">-{fmt(t.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Balance acumulado */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Balance acumulado</h2>
        {monthlyTrend.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={monthlyTrend.map((m) => ({
                month: m.month,
                balance: m.income - m.expense,
              }))}
            >
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
