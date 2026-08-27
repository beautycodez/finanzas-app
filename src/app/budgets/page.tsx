"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Budget, Category } from "@/types";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [spent, setSpent] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const firstDay = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0).toISOString().split("T")[0];

    const [budgetsRes, categoriesRes, spentRes] = await Promise.all([
      supabase
        .from("budgets")
        .select("*, categories(name, color)")
        .eq("year", currentYear)
        .eq("month", currentMonth),
      supabase.from("categories").select("*").eq("type", "expense").order("name"),
      supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("type", "expense")
        .gte("transaction_date", firstDay)
        .lte("transaction_date", lastDay),
    ]);

    if (budgetsRes.data) setBudgets(budgetsRes.data as Budget[]);
    if (categoriesRes.data) {
      setCategories(categoriesRes.data as Category[]);
      setExpenseCategories(categoriesRes.data as Category[]);
    }

    if (spentRes.data) {
      const map: Record<number, number> = {};
      for (const t of spentRes.data) {
        map[t.category_id] = (map[t.category_id] || 0) + t.amount;
      }
      setSpent(map);
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      category_id: Number(categoryId),
      amount: Number(amount),
      period: "monthly" as const,
      year: currentYear,
      month: currentMonth,
    };

    console.log("Budget payload:", payload);

    if (editingId) {
      const { error } = await supabase.from("budgets").update(payload).eq("id", editingId);
      if (error) console.error("Error updating budget:", error.message);
    } else {
      const { error } = await supabase.from("budgets").insert(payload);
      if (error) console.error("Error inserting budget:", error.message);
    }
    resetForm();
    loadData();
  }

  function resetForm() {
    setCategoryId("");
    setAmount("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(b: Budget) {
    setCategoryId(String(b.category_id));
    setAmount(String(b.amount));
    setEditingId(b.id);
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar este presupuesto?")) return;
    await supabase.from("budgets").delete().eq("id", id);
    loadData();
  }

  function fmt(n: number) {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 }).format(n);
  }

  const monthName = now.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const usedCategoryIds = budgets.map((b) => b.category_id);
  const availableCategories = expenseCategories.filter((c) => !usedCategoryIds.includes(c.id) || editingId);

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Cargando presupuestos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Presupuestos</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          {showForm ? "Cancelar" : "+ Nuevo"}
        </button>
      </div>

      <p className="text-sm text-gray-500 capitalize">{monthName}</p>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto (S/)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
            {editingId ? "Actualizar" : "Guardar"}
          </button>
        </form>
      )}

      {budgets.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-400">
          No hay presupuestos este mes. Crea uno para empezar a controlar tus gastos.
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map((b) => {
            const cat = Array.isArray(b.categories) ? b.categories[0] : b.categories;
            const used = spent[b.category_id] || 0;
            const pct = b.amount > 0 ? Math.min((used / b.amount) * 100, 100) : 0;
            const remaining = b.amount - used;
            const isOver = used > b.amount;

            return (
              <div key={b.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat?.color || "#94a3b8" }} />
                    <span className="font-medium text-gray-800">{cat?.name || "Sin categoria"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">{fmt(used)} / {fmt(b.amount)}</p>
                      <p className={`text-xs ${isOver ? "text-red-500" : "text-gray-500"}`}>
                        {isOver ? `+${fmt(used - b.amount)} sobre presupuesto` : `${fmt(remaining)} restante`}
                      </p>
                    </div>
                    <button onClick={() => startEdit(b)} className="text-blue-500 hover:text-blue-700 text-sm">Editar</button>
                    <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:text-red-700 text-sm">X</button>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-400">
                  <span>0%</span>
                  <span className="font-semibold text-gray-600">{pct.toFixed(0)}%</span>
                  <span>100%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
