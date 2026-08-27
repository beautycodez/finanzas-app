"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Account, Category } from "@/types";

interface Props {
  onTransactionAdded?: () => void;
}

export default function TransactionForm({ onTransactionAdded }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<"income" | "expense" | "transfer">("expense");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [accountsRes, categoriesRes] = await Promise.all([
      supabase.from("accounts").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
    ]);
    if (accountsRes.error) console.error("Error loading accounts:", accountsRes.error.message);
    if (categoriesRes.error) console.error("Error loading categories:", categoriesRes.error.message);
    if (accountsRes.data) setAccounts(accountsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
  }

  const filteredCategories = categories.filter((c) => c.type === (type === "transfer" ? "expense" : type));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const txnAmount = Number(amount);

    if (type === "transfer") {
      // Transfer: create two transactions
      const fromId = Number(accountId);
      const toId = Number(toAccountId);

      if (fromId === toId) {
        setMessage("Error: Las cuentas deben ser diferentes");
        setLoading(false);
        return;
      }

      // Create transfer-out transaction
      const { error: err1 } = await supabase.from("transactions").insert({
        account_id: fromId,
        category_id: null,
        amount: txnAmount,
        type: "expense",
        description: description || `Transferencia a ${accounts.find((a) => a.id === toId)?.name || "cuenta"}`,
        transaction_date: date,
      });

      if (err1) {
        setMessage("Error: " + err1.message);
        setLoading(false);
        return;
      }

      // Create transfer-in transaction
      const { error: err2 } = await supabase.from("transactions").insert({
        account_id: toId,
        category_id: null,
        amount: txnAmount,
        type: "income",
        description: description || `Transferencia de ${accounts.find((a) => a.id === fromId)?.name || "cuenta"}`,
        transaction_date: date,
      });

      if (err2) {
        setMessage("Error: " + err2.message);
        setLoading(false);
        return;
      }

      // Update balances
      const [accFrom, accTo] = await Promise.all([
        supabase.from("accounts").select("balance").eq("id", fromId).single(),
        supabase.from("accounts").select("balance").eq("id", toId).single(),
      ]);

      if (accFrom.data) {
        await supabase.from("accounts").update({ balance: accFrom.data.balance - txnAmount }).eq("id", fromId);
      }
      if (accTo.data) {
        await supabase.from("accounts").update({ balance: accTo.data.balance + txnAmount }).eq("id", toId);
      }

      setMessage("Transferencia guardada!");
      setAmount("");
      setDescription("");
      setAccountId("");
      setToAccountId("");
      onTransactionAdded?.();
    } else {
      // Income or Expense
      const accId = Number(accountId);

      const { error } = await supabase.from("transactions").insert({
        account_id: accId,
        category_id: Number(categoryId) || null,
        amount: txnAmount,
        type,
        description: description || null,
        transaction_date: date,
      });

      if (error) {
        setMessage("Error: " + error.message);
      } else {
        const delta = type === "income" ? txnAmount : -txnAmount;
        const { data: account } = await supabase
          .from("accounts")
          .select("balance")
          .eq("id", accId)
          .single();

        if (account) {
          await supabase
            .from("accounts")
            .update({ balance: account.balance + delta })
            .eq("id", accId);
        }

        setMessage("Transaccion guardada!");
        setAmount("");
        setDescription("");
        setCategoryId("");
        onTransactionAdded?.();
      }
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-800">Nueva Transaccion</h2>

      {/* Tipo */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setType("expense"); setCategoryId(""); }}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            type === "expense"
              ? "bg-red-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Gasto
        </button>
        <button
          type="button"
          onClick={() => { setType("income"); setCategoryId(""); }}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            type === "income"
              ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Ingreso
        </button>
        <button
          type="button"
          onClick={() => { setType("transfer"); setCategoryId(""); }}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            type === "transfer"
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Transferir
        </button>
      </div>

      {/* Cuenta origen */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {type === "transfer" ? "Cuenta Origen" : "Cuenta"}
        </label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar cuenta</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency}) — {new Intl.NumberFormat("es-PE", { style: "currency", currency: a.currency }).format(a.balance)}
            </option>
          ))}
        </select>
      </div>

      {/* Cuenta destino (solo transferencias) */}
      {type === "transfer" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Destino</label>
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seleccionar cuenta destino</option>
            {accounts.filter((a) => String(a.id) !== accountId).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency}) — {new Intl.NumberFormat("es-PE", { style: "currency", currency: a.currency }).format(a.balance)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Categoria (no transferencias) */}
      {type !== "transfer" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Sin categoria</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Monto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Fecha */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Descripcion */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
          type === "transfer" ? "bg-blue-600 hover:bg-blue-700" :
          type === "income" ? "bg-green-600 hover:bg-green-700" :
          "bg-red-600 hover:bg-red-700"
        }`}
      >
        {loading ? "Guardando..." : type === "transfer" ? "Transferir" : "Guardar"}
      </button>

      {message && (
        <p className={`text-sm text-center ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
