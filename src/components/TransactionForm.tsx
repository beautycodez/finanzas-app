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
  const [type, setType] = useState<"income" | "expense">("expense");
  const [accountId, setAccountId] = useState("");
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
      supabase.from("accounts").select("*"),
      supabase.from("categories").select("*"),
    ]);
    if (accountsRes.error) console.error("Error loading accounts:", accountsRes.error.message);
    if (categoriesRes.error) console.error("Error loading categories:", categoriesRes.error.message);
    if (accountsRes.data) setAccounts(accountsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
  }

  const filteredCategories = categories.filter((c) => c.type === type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const txnAmount = Number(amount);
    const accId = Number(accountId);

    const { error } = await supabase.from("transactions").insert({
      account_id: accId,
      category_id: Number(categoryId),
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
      </div>

      {/* Cuenta */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar cuenta</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.type})
            </option>
          ))}
        </select>
      </div>

      {/* Categoria */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar categoria</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

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
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar"}
      </button>

      {message && (
        <p className={`text-sm text-center ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
