"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Recurring, Category, Account } from "@/types";

const frequencyLabels: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

const frequencyMultipliers: Record<string, { month: number; year: number }> = {
  weekly: { month: 4.33, year: 52 },
  biweekly: { month: 2, year: 26 },
  monthly: { month: 1, year: 12 },
  quarterly: { month: 0.33, year: 4 },
  yearly: { month: 0.083, year: 1 },
};

export default function RecurringPage() {
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [recurringRes, categoriesRes, accountsRes] = await Promise.all([
      supabase.from("recurring").select("*, categories(name, color), accounts(name)").order("amount", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
      supabase.from("accounts").select("*").order("name"),
    ]);

    if (recurringRes.data) setRecurring(recurringRes.data as Recurring[]);
    if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
    if (accountsRes.data) setAccounts(accountsRes.data as Account[]);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const today = new Date().toISOString().split("T")[0];
    const payload = {
      account_id: Number(accountId),
      category_id: Number(categoryId),
      amount: Number(amount),
      type,
      frequency,
      start_date: today,
      description: description || null,
    };

    if (editingId) {
      await supabase.from("recurring").update(payload).eq("id", editingId);
    } else {
      await supabase.from("recurring").insert(payload);
    }
    resetForm();
    loadData();
  }

  function resetForm() {
    setAccountId("");
    setCategoryId("");
    setAmount("");
    setFrequency("monthly");
    setDescription("");
    setType("expense");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(r: Recurring) {
    setAccountId(String(r.account_id));
    setCategoryId(String(r.category_id));
    setAmount(String(r.amount));
    setFrequency(r.frequency);
    setDescription(r.description || "");
    setType(r.type);
    setEditingId(r.id);
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar este recurrente?")) return;
    await supabase.from("recurring").delete().eq("id", id);
    loadData();
  }

  function fmt(n: number) {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 }).format(n);
  }

  const filteredCategories = categories.filter((c) => c.type === type);

  const totalMonthlyExpense = recurring
    .filter((r) => r.type === "expense")
    .reduce((sum, r) => sum + r.amount * (frequencyMultipliers[r.frequency]?.month || 1), 0);

  const totalMonthlyIncome = recurring
    .filter((r) => r.type === "income")
    .reduce((sum, r) => sum + r.amount * (frequencyMultipliers[r.frequency]?.month || 1), 0);

  const totalYearlyExpense = recurring
    .filter((r) => r.type === "expense")
    .reduce((sum, r) => sum + r.amount * (frequencyMultipliers[r.frequency]?.year || 12), 0);

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Cargando recurrentes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Gastos Fijos / Recurrentes</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          {showForm ? "Cancelar" : "+ Nuevo"}
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Ingresos fijos / mes</p>
          <p className="text-xl font-bold text-green-600">{fmt(totalMonthlyIncome)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Gastos fijos / mes</p>
          <p className="text-xl font-bold text-red-600">{fmt(totalMonthlyExpense)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Comprometido / ano</p>
          <p className="text-xl font-bold text-gray-800">{fmt(totalYearlyExpense)}</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setType("expense")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === "expense" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"}`}>
              Gasto fijo
            </button>
            <button type="button" onClick={() => setType("income")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === "income" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`}>
              Ingreso fijo
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar</option>
                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (S/)</label>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500">
                {Object.entries(frequencyLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Netflix, Alquiler..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500" />
          </div>

          <button type="submit" className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
            {editingId ? "Actualizar" : "Guardar"}
          </button>
        </form>
      )}

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {recurring.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay gastos recurrentes</div>
        ) : (
          recurring.map((r) => {
            const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories;
            const mult = frequencyMultipliers[r.frequency] || { month: 1, year: 12 };
            const monthly = r.amount * mult.month;
            const yearly = r.amount * mult.year;

            return (
              <div key={r.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: cat?.color || "#94a3b8" }}>
                    {r.type === "income" ? "+" : "-"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{cat?.name || "Sin categoria"}</p>
                    <p className="text-xs text-gray-500">
                      {frequencyLabels[r.frequency]} · {r.description || "Sin descripcion"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-semibold ${r.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {fmt(r.amount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {fmt(monthly)}/mes · {fmt(yearly)}/ano
                    </p>
                  </div>
                  <button onClick={() => startEdit(r)} className="text-blue-500 hover:text-blue-700 text-sm">Editar</button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700 text-sm">X</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
