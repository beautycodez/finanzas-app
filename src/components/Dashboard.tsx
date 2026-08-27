"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useDateFilter } from "@/lib/dateFilter";

interface CurrencySummary {
  currency: string;
  income: number;
  expenses: number;
}

export default function Dashboard() {
  const [summaries, setSummaries] = useState<CurrencySummary[]>([]);
  const [accountCount, setAccountCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { from, to } = useDateFilter();

  useEffect(() => {
    loadSummary();
  }, [from, to]);

  async function loadSummary() {
    setLoading(true);

    const [transactionsRes, accountsRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount, type, transaction_date, accounts(currency)")
        .gte("transaction_date", from)
        .lte("transaction_date", to),
      supabase.from("accounts").select("id"),
    ]);

    const txns = transactionsRes.data || [];
    const map: Record<string, CurrencySummary> = {};

    for (const txn of txns) {
      const acct = Array.isArray(txn.accounts) ? txn.accounts[0] : txn.accounts;
      const cur = (acct as { currency: string } | null)?.currency || "USD";
      if (!map[cur]) map[cur] = { currency: cur, income: 0, expenses: 0 };
      if (txn.type === "income") {
        map[cur].income += txn.amount;
      } else if (txn.type === "expense") {
        map[cur].expenses += txn.amount;
      }
    }

    setSummaries(Object.values(map));
    setAccountCount(accountsRes.data?.length || 0);
    setLoading(false);
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

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
        <p className="text-sm text-gray-500">Cuentas activas: <span className="font-semibold text-gray-700">{accountCount}</span></p>
      </div>
    </div>
  );
}
