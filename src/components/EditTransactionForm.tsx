"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Account, Category, Transaction } from "@/types";

interface Props {
  transaction: Transaction;
  pair?: Transaction;
  onSaved?: () => void;
}

export default function EditTransactionForm({ transaction, pair, onSaved }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<"income" | "expense" | "transfer">(transaction.type);
  const [accountId, setAccountId] = useState(String(transaction.account_id));
  const [toAccountId, setToAccountId] = useState(pair ? String(pair.account_id) : "");
  const [categoryId, setCategoryId] = useState(transaction.category_id ? String(transaction.category_id) : "");
  const [amount, setAmount] = useState(String(transaction.amount));
  const [description, setDescription] = useState(transaction.description || "");
  const [date, setDate] = useState(transaction.transaction_date);
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
    if (accountsRes.data) setAccounts(accountsRes.data as Account[]);
    if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
  }

  const filteredCategories = categories.filter((c) => c.type === (type === "transfer" ? "expense" : type));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const newAmount = Number(amount);
    const newAccountId = Number(accountId);

    if (transaction.type === "transfer") {
      // Reverses old balances, applies new ones
      const newToAccountId = Number(toAccountId);
      if (newAccountId === newToAccountId) {
        setMessage("Error: Las cuentas deben ser diferentes");
        setLoading(false);
        return;
      }

      const oldAmount = transaction.amount;
      const oldFrom = transaction.transfer_to ? transaction.account_id : pair?.account_id;
      const oldTo = transaction.transfer_to ? pair?.account_id : transaction.account_id;

      if (pair) {
        // Reverse old balances
        if (oldFrom && oldTo) {
          const [oa, ob] = await Promise.all([
            supabase.from("accounts").select("balance").eq("id", oldFrom).single(),
            supabase.from("accounts").select("balance").eq("id", oldTo).single(),
          ]);
          if (oa.data) await supabase.from("accounts").update({ balance: oa.data.balance + oldAmount }).eq("id", oldFrom);
          if (ob.data) await supabase.from("accounts").update({ balance: ob.data.balance - oldAmount }).eq("id", oldTo);
        }

        // Apply new balances
        const [na, nb] = await Promise.all([
          supabase.from("accounts").select("balance").eq("id", newAccountId).single(),
          supabase.from("accounts").select("balance").eq("id", newToAccountId).single(),
        ]);
        if (na.data) await supabase.from("accounts").update({ balance: na.data.balance - newAmount }).eq("id", newAccountId);
        if (nb.data) await supabase.from("accounts").update({ balance: nb.data.balance + newAmount }).eq("id", newToAccountId);

        // Update both transactions
        const fromName = accounts.find((a) => a.id === newAccountId)?.name || "cuenta";
        const toName = accounts.find((a) => a.id === newToAccountId)?.name || "cuenta";
        await supabase.from("transactions").update({
          account_id: newAccountId,
          amount: newAmount,
          description: description || `Transferencia a ${toName}`,
          transaction_date: date,
        }).eq("id", transaction.id);
        await supabase.from("transactions").update({
          account_id: newToAccountId,
          amount: newAmount,
          description: description || `Transferencia de ${fromName}`,
          transaction_date: date,
        }).eq("id", pair.id);

        setMessage("Transferencia actualizada!");
      } else {
        // Unpaired transfer - just update this row
        const acc = await supabase.from("accounts").select("balance").eq("id", transaction.account_id).single();
        const oldReverse = transaction.transfer_to ? transaction.amount : -transaction.amount;
        const newReverse = transaction.transfer_to ? newAmount : -newAmount;
        if (acc.data) await supabase.from("accounts").update({ balance: acc.data.balance - oldReverse + newReverse }).eq("id", transaction.account_id);
        await supabase.from("transactions").update({ amount: newAmount, description, transaction_date: date }).eq("id", transaction.id);
        setMessage("Transaccion actualizada!");
      }

      onSaved?.();
      setLoading(false);
      return;
    }

    const newCategoryId = categoryId ? Number(categoryId) : null;

    // Reverse old balance
    const oldDelta = transaction.type === "income" ? transaction.amount : -transaction.amount;
    const oldAcc = await supabase.from("accounts").select("balance").eq("id", transaction.account_id).single();
    if (oldAcc.data) {
      await supabase.from("accounts").update({ balance: oldAcc.data.balance - oldDelta }).eq("id", transaction.account_id);
    }

    // Apply new balance (if account changed, apply to new account)
    const newDelta = type === "income" ? newAmount : -newAmount;
    const newAcc = await supabase.from("accounts").select("balance").eq("id", newAccountId).single();
    if (newAcc.data) {
      await supabase.from("accounts").update({ balance: newAcc.data.balance + newDelta }).eq("id", newAccountId);
    }

    const { error } = await supabase.from("transactions").update({
      account_id: newAccountId,
      category_id: newCategoryId,
      amount: newAmount,
      type,
      description: description || null,
      transaction_date: date,
    }).eq("id", transaction.id);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Transaccion actualizada!");
      onSaved?.();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setType("expense")}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${type === "expense" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>Gasto</button>
        <button type="button" onClick={() => setType("income")}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${type === "income" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>Ingreso</button>
        <button type="button" onClick={() => setType("transfer")}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${type === "transfer" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>Transferir</button>
      </div>

      {type === "transfer" ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Origen</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Destino</label>
            <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {accounts.filter((a) => String(a.id) !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500">
              <option value="">Sin categoria</option>
              {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
        <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500" />
      </div>

      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
        {loading ? "Guardando..." : "Guardar Cambios"}
      </button>

      {message && (
        <p className={`text-sm text-center ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>{message}</p>
      )}
    </form>
  );
}
