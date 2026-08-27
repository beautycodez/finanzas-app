"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Transaction } from "@/types";

interface Props {
  accountId: number;
  currency?: string;
}

export default function AccountTransactions({ accountId, currency = "USD" }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [accountId]);

  async function loadTransactions() {
    const { data } = await supabase
      .from("transactions")
      .select("*, categories(name, type, color)")
      .eq("account_id", accountId)
      .order("transaction_date", { ascending: false });

    if (data) setTransactions(data as Transaction[]);
    setLoading(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar esta transaccion?")) return;

    const { data: txn } = await supabase
      .from("transactions")
      .select("account_id, amount, type")
      .eq("id", id)
      .single();

    if (txn) {
      const delta = txn.type === "income" ? -txn.amount : txn.amount;
      const { data: account } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", txn.account_id)
        .single();

      if (account) {
        await supabase
          .from("accounts")
          .update({ balance: account.balance + delta })
          .eq("id", txn.account_id);
      }
    }

    await supabase.from("transactions").delete().eq("id", id);
    loadTransactions();
  }

  function formatCurrency(amount: number) {
    const locale = currency === "PEN" ? "es-PE" : "es-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function groupByDate(txns: Transaction[]) {
    const groups: { date: string; items: Transaction[] }[] = [];
    let currentDate = "";

    for (const txn of txns) {
      if (txn.transaction_date !== currentDate) {
        currentDate = txn.transaction_date;
        groups.push({ date: currentDate, items: [] });
      }
      groups[groups.length - 1].items.push(txn);
    }

    return groups;
  }

  const grouped = groupByDate(transactions);

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Cargando movimientos...</div>;
  }

  return (
    <div className="space-y-4">
      {grouped.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No hay movimientos</div>
      ) : (
        grouped.map((group) => (
          <div key={group.date}>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2 px-1">
              {formatDate(group.date)}
            </p>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
              {group.items.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: txn.categories?.color || "#94a3b8" }}
                    >
                      {txn.type === "income" ? "+" : "-"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {txn.categories?.name || "Sin categoria"}
                      </p>
                      {txn.description && (
                        <p className="text-sm text-gray-500 truncate">{txn.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p
                      className={`font-semibold ${
                        txn.type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {txn.type === "income" ? "+" : "-"}
                      {formatCurrency(txn.amount)}
                    </p>
                    <button
                      onClick={() => handleDelete(txn.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Eliminar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
