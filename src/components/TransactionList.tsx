"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useDateFilter } from "@/lib/dateFilter";
import type { Transaction } from "@/types";

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const { from, to } = useDateFilter();

  useEffect(() => {
    loadTransactions();
  }, [filter, from, to]);

  async function loadTransactions() {
    setLoading(true);
    let query = supabase
      .from("transactions")
      .select("*, categories(name, type, color), accounts(name)")
      .gte("transaction_date", from)
      .lte("transaction_date", to)
      .order("transaction_date", { ascending: false })
      .limit(50);

    if (filter !== "all") {
      query = query.eq("type", filter);
    }

    const { data, error } = await query;
    if (error) console.error("Error loading transactions:", error.message);
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
    return new Intl.NumberFormat("es-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Filtros */}
      <div className="flex gap-2 p-4 border-b border-gray-100">
        {(["all", "expense", "income"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? f === "expense"
                  ? "bg-red-500 text-white"
                  : f === "income"
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "Todos" : f === "expense" ? "Gastos" : "Ingresos"}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay transacciones</div>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: t.categories?.color || "#94a3b8" }}
                >
                  {t.type === "income" ? "+" : "-"}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{t.categories?.name || "Sin categoria"}</p>
                  <p className="text-sm text-gray-500">
                    {t.accounts?.name} {t.description ? `· ${t.description}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(t.transaction_date)}</p>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Eliminar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
