"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useDateFilter } from "@/lib/dateFilter";
import { formatDateShort } from "@/lib/dateFormat";
import type { Transaction } from "@/types";

type Filter = "all" | "income" | "expense" | "transfer";

export default function TransactionList({ limit }: { limit?: number }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Record<number, { id: number; name: string; currency: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const { from, to } = useDateFilter();

  useEffect(() => {
    loadTransactions();
  }, [filter, from, to]);

  function accountName(id: number | null) {
    if (!id) return "?";
    return accounts[id]?.name || `Cuenta ${id}`;
  }

  async function loadTransactions() {
    setLoading(true);
    setError("");
    let query = supabase
      .from("transactions")
      .select("id, account_id, category_id, amount, type, description, transfer_from, transfer_to, transaction_date, created_at, categories(name, type, color)")
      .gte("transaction_date", from)
      .lte("transaction_date", to)
      .order("transaction_date", { ascending: false })
      .limit(limit || 100);

    if (filter === "transfer") {
      query = query.eq("type", "transfer");
    } else if (filter !== "all") {
      query = query.eq("type", filter);
    }

    const [txRes, accRes] = await Promise.all([
      query,
      supabase.from("accounts").select("id, name, currency"),
    ]);

    if (accRes.data) {
      const map: Record<number, { id: number; name: string; currency: string }> = {};
      for (const a of accRes.data) map[a.id] = a;
      setAccounts(map);
    }

    const { data, error } = txRes;
    if (error) {
      console.error("Error loading transactions:", error.message);
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data) {
      const txns = data as unknown as Transaction[];
      if (filter === "transfer") {
        const grouped = groupTransfers(txns);
        setTransactions(grouped);
      } else {
        setTransactions(txns);
      }
    }
    setLoading(false);
  }

  function groupTransfers(txns: Transaction[]): Transaction[] {
    const pairs: Transaction[] = [];
    const used = new Set<number>();

    for (let i = 0; i < txns.length; i++) {
      if (used.has(txns[i].id)) continue;
      const t = txns[i];
      // Find the linked pair via transfer_from/transfer_to (both are transfer type)
      const pair = txns.find(
        (p) =>
          !used.has(p.id) &&
          p.id !== t.id &&
          p.type === "transfer" &&
          (p.transfer_to === t.account_id || p.transfer_from === t.account_id)
      );
      if (pair) {
        used.add(t.id);
        used.add(pair.id);
        // The "from" side is the one that has transfer_to pointing at the pair's account
        const fromSide = t.transfer_to ? t : pair;
        pairs.push({
          ...fromSide,
          transfer_pair: pair,
        } as Transaction & { transfer_pair: Transaction });
      } else {
        pairs.push(t);
      }
    }
    return pairs;
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar esta transaccion?")) return;

    const { data: txn } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (!txn) return;

    if (txn.type === "transfer") {
      // Find the linked pair
      const { data: pair } = await supabase
        .from("transactions")
        .select("id, account_id, amount")
        .eq("type", "transfer")
        .neq("id", id)
        .or(`transfer_to.eq.${txn.account_id},transfer_from.eq.${txn.account_id}`)
        .limit(1)
        .single();

      if (pair) {
        // The deleted side determines which account was debited
        const [accA, accB] = await Promise.all([
          supabase.from("accounts").select("balance").eq("id", txn.account_id).single(),
          supabase.from("accounts").select("balance").eq("id", pair.account_id).single(),
        ]);
        // If this side transferred out (transfer_to set), it was debited
        const thisDebited = txn.transfer_to;
        if (accA.data) {
          await supabase.from("accounts").update({
            balance: accA.data.balance + (thisDebited ? txn.amount : -txn.amount),
          }).eq("id", txn.account_id);
        }
        if (accB.data) {
          await supabase.from("accounts").update({
            balance: accB.data.balance + (thisDebited ? -pair.amount : pair.amount),
          }).eq("id", pair.account_id);
        }
        await supabase.from("transactions").delete().eq("id", pair.id);
      } else {
        // Unpaired transfer - just reverse this account
        const acc = await supabase.from("accounts").select("balance").eq("id", txn.account_id).single();
        const reverse = txn.transfer_to ? txn.amount : -txn.amount;
        if (acc.data) await supabase.from("accounts").update({ balance: acc.data.balance + reverse }).eq("id", txn.account_id);
      }
    } else if (txn.type !== "transfer") {
      // Regular income/expense
      const delta = txn.type === "income" ? -txn.amount : txn.amount;
      const acc = await supabase.from("accounts").select("balance").eq("id", txn.account_id).single();
      if (acc.data) await supabase.from("accounts").update({ balance: acc.data.balance + delta }).eq("id", txn.account_id);
    }

    await supabase.from("transactions").delete().eq("id", id);
    loadTransactions();
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2 }).format(amount);
  }

  function formatDate(dateStr: string) {
    return formatDateShort(dateStr);
  }

  function isTransfer(t: Transaction) {
    return t.type === "transfer";
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Filtros */}
      <div className="flex gap-2 p-4 border-b border-gray-100 flex-wrap">
        {(["all", "expense", "income", "transfer"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? f === "expense"
                  ? "bg-red-500 text-white"
                  : f === "income"
                  ? "bg-green-500 text-white"
                  : f === "transfer"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "Todos" : f === "expense" ? "Gastos" : f === "income" ? "Ingresos" : "Transferencias"}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Error al cargar: {error}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay transacciones</div>
        ) : (
          transactions.map((t) => {
            const transfer = isTransfer(t);
            const pair = (t as Transaction & { transfer_pair?: Transaction }).transfer_pair;

            return (
              <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      transfer ? "bg-blue-500" : t.type === "income" ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    {transfer ? "⇄" : t.type === "income" ? "+" : "-"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {transfer
                        ? `Transferencia`
                        : t.categories?.name || "Sin categoria"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {transfer
                        ? `${accountName(t.account_id)} → ${accountName(pair?.account_id ?? null)}`
                        : accountName(t.account_id)}
                      {t.description ? ` · ${t.description}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transfer ? "text-blue-600" : t.type === "income" ? "text-green-600" : "text-red-600"
                    }`}>
                      {transfer ? formatCurrency(t.amount) : `${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)}`}
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
            );
          })
        )}
      </div>
    </div>
  );
}
