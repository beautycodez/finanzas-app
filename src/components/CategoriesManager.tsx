"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/types";

const colorPresets = [
  "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#a855f7", "#e11d48", "#0891b2", "#65a30d",
];

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState("#3b82f6");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const { data } = await supabase.from("categories").select("*").order("type").order("name");
    if (data) setCategories(data as Category[]);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await supabase
        .from("categories")
        .update({ name, type, color })
        .eq("id", editingId);
    } else {
      await supabase.from("categories").insert({ name, type, color });
    }
    resetForm();
    loadCategories();
  }

  function resetForm() {
    setName("");
    setType("expense");
    setColor("#3b82f6");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(cat: Category) {
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color || "#3b82f6");
    setEditingId(cat.id);
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar esta categoria?")) return;
    await supabase.from("categories").delete().eq("id", id);
    loadCategories();
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">Categorias</h2>
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
                placeholder="Ej: Alimentacion"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "income" | "expense")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex gap-2 flex-wrap">
              {colorPresets.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c ? "border-gray-800 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border-0"
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

      <div className="p-5 space-y-5">
        {loading ? (
          <p className="text-center text-gray-400">Cargando...</p>
        ) : categories.length === 0 ? (
          <p className="text-center text-gray-400">No hay categorias</p>
        ) : (
          <>
            {/* Gastos */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Gastos</p>
              <div className="space-y-1">
                {expenseCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color || "#94a3b8" }} />
                      <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(cat)} className="text-blue-500 hover:text-blue-700 text-sm">Editar</button>
                      <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:text-red-700 text-sm">Eliminar</button>
                    </div>
                  </div>
                ))}
                {expenseCategories.length === 0 && <p className="text-sm text-gray-400">No hay categorias de gasto</p>}
              </div>
            </div>

            {/* Ingresos */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Ingresos</p>
              <div className="space-y-1">
                {incomeCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color || "#94a3b8" }} />
                      <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(cat)} className="text-blue-500 hover:text-blue-700 text-sm">Editar</button>
                      <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:text-red-700 text-sm">Eliminar</button>
                    </div>
                  </div>
                ))}
                {incomeCategories.length === 0 && <p className="text-sm text-gray-400">No hay categorias de ingreso</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
