"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useDateFilter } from "@/lib/dateFilter";

interface CurrencySummary {
  currency: string;
  income: number;
  expenses: number;
}

interface CreditDebt {
  currency: string;
  total: number;
  accounts: { id: number; name: string; balance: number }[];
}

interface BalanceSummary {
  currency: string;
  total: number;
  accounts: { id: number; name: string; balance: number }[];
}

export default function Dashboard() {
  const [summaries, setSummaries] = useState<CurrencySummary[]>([]);
  const [accountCount, setAccountCount] = useState(0);
  const [creditDebts, setCreditDebts] = useState<CreditDebt[]>([]);
  const [checkingBalances, setCheckingBalances] = useState<BalanceSummary[]>([]);
  const [savingsBalances, setSavingsBalances] = useState<BalanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { from, to } = useDateFilter();

  useEffect(() => {
    loadSummary();
  }, [from, to]);

  async function loadSummary() {
    setLoading(true);

    const [transactionsRes, accountsRes, accountMapRes, creditRes, checkingRes, savingsRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("account_id, amount, type, transaction_date")
        .gte("transaction_date", from)
        .lte("transaction_date", to),
      supabase.from("accounts").select("id"),
      supabase.from("accounts").select("id, currency"),
      supabase
        .from("accounts")
        .select("id, name, currency, balance")
        .eq("type", "credit_card")
        .order("name"),
      supabase
        .from("accounts")
        .select("id, name, currency, balance")
        .eq("type", "checking")
        .order("name"),
      supabase
        .from("accounts")
        .select("id, name, currency, balance")
        .eq("type", "savings")
        .order("name"),
    ]);

    const curMap: Record<number, string> = {};
    for (const a of accountMapRes.data || []) curMap[a.id] = a.currency;

    const txns = transactionsRes.data || [];
    const map: Record<string, CurrencySummary> = {};

    for (const txn of txns) {
      const cur = curMap[txn.account_id] || "USD";
      if (!map[cur]) map[cur] = { currency: cur, income: 0, expenses: 0 };
      if (txn.type === "income") {
        map[cur].income += txn.amount;
      } else if (txn.type === "expense") {
        map[cur].expenses += txn.amount;
      }
    }

    // Sum credit card debt by currency
    const debtMap: Record<string, CreditDebt> = {};
    for (const acc of creditRes.data || []) {
      const cur = acc.currency || "USD";
      if (!debtMap[cur]) debtMap[cur] = { currency: cur, total: 0, accounts: [] };
      // Balance is negative when you owe; show absolute value as debt
      const debt = acc.balance < 0 ? Math.abs(acc.balance) : 0;
      debtMap[cur].total += debt;
      debtMap[cur].accounts.push({ id: acc.id, name: acc.name, balance: acc.balance });
    }

    setSummaries(Object.values(map));
    setCreditDebts(Object.values(debtMap).filter((d) => d.total > 0));
    setCheckingBalances(summarizeBalances(checkingRes.data || []));
    setSavingsBalances(summarizeBalances(savingsRes.data || []));
    setAccountCount(accountsRes.data?.length || 0);
    setLoading(false);
  }

  function summarizeBalances(accounts: { id: number; name: string; currency: string; balance: number }[]): BalanceSummary[] {
    const map: Record<string, BalanceSummary> = {};
    for (const acc of accounts) {
      const cur = acc.currency || "USD";
      if (!map[cur]) map[cur] = { currency: cur, total: 0, accounts: [] };
      map[cur].total += acc.balance;
      map[cur].accounts.push({ id: acc.id, name: acc.name, balance: acc.balance });
    }
    return Object.values(map).filter((s) => s.total !== 0);
  }

  function formatCurrency(amount: number, currency: string) {
    const locale = currency === "PEN" ? "es-PE" : "es-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  const dateLabel = from === to
    ? new Date(from + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : `${new Date(from + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })} — ${new Date(to + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Cargando dashboard...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{dateLabel}</h2>
      </div>

      {summaries.length === 0 ? (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center text-gray-400">
          Sin movimientos en este periodo
        </div>
      ) : (
        summaries.map((s) => (
          <div key={s.currency} className="space-y-2">
            <p className="text-sm font-medium text-gray-500 px-1">
              {s.currency === "PEN" ? "Soles (S/)" : "Dolares ($)"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Ingresos</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(s.income, s.currency)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Gastos</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(s.expenses, s.currency)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Balance</p>
                <p className={`text-2xl font-bold ${s.income - s.expenses >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {formatCurrency(s.income - s.expenses, s.currency)}
                </p>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Dinero en cuentas corrientes */}
      {checkingBalances.length > 0 && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Dinero en Cuentas Corrientes</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {checkingBalances.reduce((acc, d) => acc + d.accounts.length, 0)} cuentas
            </span>
          </div>
          <div className="space-y-3">
            {checkingBalances.map((d) => (
              <div key={d.currency}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{d.currency === "PEN" ? "Soles (S/)" : "Dolares ($)"}</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(d.total, d.currency)}
                  </p>
                </div>
                <div className="mt-1">
                  {d.accounts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{a.name}</span>
                      <span className="text-gray-700 font-medium">{formatCurrency(a.balance, d.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dinero en ahorros */}
      {savingsBalances.length > 0 && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-100 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Dinero en Ahorros</p>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
              {savingsBalances.reduce((acc, d) => acc + d.accounts.length, 0)} cuentas
            </span>
          </div>
          <div className="space-y-3">
            {savingsBalances.map((d) => (
              <div key={d.currency}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{d.currency === "PEN" ? "Soles (S/)" : "Dolares ($)"}</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatCurrency(d.total, d.currency)}
                  </p>
                </div>
                <div className="mt-1">
                  {d.accounts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{a.name}</span>
                      <span className="text-gray-700 font-medium">{formatCurrency(a.balance, d.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {creditDebts.length > 0 && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-red-100 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Deudas de Tarjetas de Credito</p>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
              {creditDebts.reduce((acc, d) => acc + d.accounts.length, 0)} {creditDebts.reduce((acc, d) => acc + d.accounts.length, 0) === 1 ? "tarjeta con deuda" : "tarjetas con deuda"}
            </span>
          </div>
          <div className="space-y-3">
            {creditDebts.map((d) => (
              <div key={d.currency}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{d.currency === "PEN" ? "Soles (S/)" : "Dolares ($)"}</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(d.total, d.currency)}
                  </p>
                </div>
                <div className="mt-1">
                  {d.accounts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{a.name}</span>
                      <span className="text-gray-700 font-medium">{formatCurrency(a.balance, d.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
        <p className="text-sm text-gray-500">Cuentas activas: <span className="font-semibold text-gray-700">{accountCount}</span></p>
      </div>
    </div>
  );
}
