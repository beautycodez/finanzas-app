"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Account } from "@/types";

const typeLabels: Record<string, string> = {
  checking: "Cuenta Corriente",
  savings: "Ahorros",
  credit_card: "Tarjeta de Credito",
  cash: "Efectivo",
  investment: "Inversiones",
};

const typeColors: Record<string, string> = {
  checking: "bg-blue-500",
  savings: "bg-green-500",
  credit_card: "bg-purple-500",
  cash: "bg-amber-500",
  investment: "bg-teal-500",
};

const currencySymbols: Record<string, string> = {
  PEN: "S/",
  USD: "$",
};

const currencyNames: Record<string, string> = {
  PEN: "Soles",
  USD: "Dolares",
};

export default function AccountBalances() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const VISIBLE_LIMIT = 5;

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    const { data } = await supabase.from("accounts").select("*").order("name");
    if (data) setAccounts(data as Account[]);
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

  const currencies = [...new Set(accounts.map((a) => a.currency || "USD"))];
  const visibleCount = expanded ? accounts.length : Math.min(VISIBLE_LIMIT, accounts.length);
  const hiddenCount = accounts.length - visibleCount;

  if (loading) {
    return <div className="text-center text-gray-400 py-4">Cargando cuentas...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Mis Cuentas</h2>

      {currencies.map((cur) => {
        const currencyAccounts = accounts
          .filter((a) => (a.currency || "USD") === cur)
          .slice(0, visibleCount);
        const total = currencyAccounts.reduce((sum, a) => sum + a.balance, 0);

        return (
          <div key={cur} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-gray-500">
                {currencySymbols[cur] || cur} {currencyNames[cur] || cur}
              </span>
              <span className="text-sm font-bold text-gray-700">
                {formatCurrency(total, cur)}
              </span>
            </div>

            <div className="space-y-2">
              {currencyAccounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/accounts/${account.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-10 rounded-full ${typeColors[account.type] || "bg-gray-400"}`} />
                    <div>
                      <p className="font-medium text-gray-800">{account.name}</p>
                      <p className="text-xs text-gray-500">{typeLabels[account.type] || account.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-lg font-bold ${account.balance >= 0 ? "text-gray-800" : "text-red-600"}`}>
                      {formatCurrency(account.balance, cur)}
                    </p>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {accounts.length > 0 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full mt-2 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {expanded ? "Ver menos" : `Ver mas (${hiddenCount} mas)`}
        </button>
      )}

      {accounts.length === 0 && (
        <p className="text-center text-gray-400 py-4">No hay cuentas creadas</p>
      )}
    </div>
  );
}
