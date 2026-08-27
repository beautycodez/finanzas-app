"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Account } from "@/types";

const typeOptions = [
  { value: "checking", label: "Cuenta Corriente" },
  { value: "savings", label: "Ahorros" },
  { value: "credit_card", label: "Tarjeta de Credito" },
  { value: "cash", label: "Efectivo" },
  { value: "investment", label: "Inversiones" },
  { value: "payable", label: "Deuda por Pagar" },
];

const currencyOptions = [
  { value: "PEN", label: "Soles (PEN)" },
  { value: "USD", label: "Dolares (USD)" },
];

export default function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [currency, setCurrency] = useState("PEN");
  const [balance, setBalance] = useState("0");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    const { data } = await supabase.from("accounts").select("*").order("name");
    if (data) setAccounts(data as Account[]);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await supabase
        .from("accounts")
        .update({ name, type, currency, balance: Number(balance) })
        .eq("id", editingId);
    } else {
      await supabase.from("accounts").insert({
        name,
        type,
        currency,
        balance: Number(balance),
      });
    }
    resetForm();
    loadAccounts();
  }

  function resetForm() {
    setName("");
    setType("checking");
    setCurrency("PEN");
    setBalance("0");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(account: Account) {
    setName(account.name);
    setType(account.type);
    setCurrency(account.currency || "USD");
    setBalance(String(account.balance));
    setEditingId(account.id);
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar esta cuenta? Las transacciones asociadas no se eliminaran.")) return;
    await supabase.from("accounts").delete().eq("id", id);
    loadAccounts();
  }

  function formatCurrency(amount: number, cur: string) {
    const locale = cur === "PEN" ? "es-PE" : "es-US";
    return new Intl.NumberFormat(locale, { style: "currency", currency: cur }).format(amount);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">Cuentas</h2>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nueva"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 bg-gray-50 border-b border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ej: Banco de Peru"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
              >
                {typeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
              >
                {currencyOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saldo inicial</label>
              <input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            {editingId ? "Actualizar" : "Guardar"}
          </button>
        </form>
      )}

      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="p-6 text-center text-gray-400">Cargando...</div>
        ) : accounts.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No hay cuentas</div>
        ) : (
          accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div>
                <p className="font-medium text-gray-800">{a.name}</p>
                <p className="text-sm text-gray-500">
                  {typeOptions.find((t) => t.value === a.type)?.label || a.type} · {a.currency || "USD"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-gray-700">
                  {formatCurrency(a.balance, a.currency || "USD")}
                </span>
                <button onClick={() => startEdit(a)} className="text-blue-500 hover:text-blue-700 text-sm">Editar</button>
                <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700 text-sm">Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
