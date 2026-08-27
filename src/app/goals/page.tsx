"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [deadline, setDeadline] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [depositGoalId, setDepositGoalId] = useState<number | null>(null);
  const [depositAmount, setDepositAmount] = useState("");

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    const { data } = await supabase.from("goals").select("*").order("created_at", { ascending: false });
    if (data) setGoals(data as Goal[]);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      target_amount: Number(targetAmount),
      current_amount: Number(currentAmount),
      deadline: deadline || null,
    };

    if (editingId) {
      await supabase.from("goals").update(payload).eq("id", editingId);
    } else {
      await supabase.from("goals").insert(payload);
    }
    resetForm();
    loadGoals();
  }

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!depositGoalId || !depositAmount) return;

    const goal = goals.find((g) => g.id === depositGoalId);
    if (!goal) return;

    const newAmount = goal.current_amount + Number(depositAmount);
    await supabase
      .from("goals")
      .update({ current_amount: Math.min(newAmount, goal.target_amount) })
      .eq("id", depositGoalId);

    setDepositGoalId(null);
    setDepositAmount("");
    loadGoals();
  }

  function resetForm() {
    setName("");
    setTargetAmount("");
    setCurrentAmount("0");
    setDeadline("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(g: Goal) {
    setName(g.name);
    setTargetAmount(String(g.target_amount));
    setCurrentAmount(String(g.current_amount));
    setDeadline(g.deadline || "");
    setEditingId(g.id);
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar esta meta?")) return;
    await supabase.from("goals").delete().eq("id", id);
    loadGoals();
  }

  function fmt(n: number) {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 }).format(n);
  }

  function daysLeft(deadline: string | null) {
    if (!deadline) return null;
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function monthlyNeeded(current: number, target: number, deadline: string | null) {
    if (!deadline) return null;
    const days = daysLeft(deadline);
    if (!days || days <= 0) return null;
    const remaining = target - current;
    return remaining / (days / 30);
  }

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Cargando metas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Metas de Ahorro</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          {showForm ? "Cancelar" : "+ Nueva meta"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="Ej: Viaje a Mexico"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto meta (S/)</label>
              <input type="number" step="0.01" min="1" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ahorrado actual (S/)</label>
              <input type="number" step="0.01" min="0" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha limite</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
            {editingId ? "Actualizar" : "Guardar"}
          </button>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-400">
          No hay metas de ahorro. Crea una para empezar a ahorrar.
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((g) => {
            const pct = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0;
            const remaining = g.target_amount - g.current_amount;
            const days = daysLeft(g.deadline);
            const monthly = monthlyNeeded(g.current_amount, g.target_amount, g.deadline);
            const isCompleted = pct >= 100;

            return (
              <div key={g.id} className={`bg-white p-5 rounded-xl shadow-sm border ${isCompleted ? "border-green-300 bg-green-50" : "border-gray-100"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{g.name}</h3>
                    {g.deadline && (
                      <p className="text-xs text-gray-500">
                        {days !== null && days > 0 ? `${days} dias restantes` : days !== null && days <= 0 ? "Vencida" : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setDepositGoalId(g.id); setDepositAmount(""); }}
                      className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600">
                      + Depositar
                    </button>
                    <button onClick={() => startEdit(g)} className="text-blue-500 hover:text-blue-700 text-sm">Editar</button>
                    <button onClick={() => handleDelete(g.id)} className="text-red-500 hover:text-red-700 text-sm">X</button>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-gray-100 rounded-full h-4 mb-2">
                  <div
                    className={`h-4 rounded-full transition-all ${isCompleted ? "bg-green-500" : "bg-blue-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-800">{fmt(g.current_amount)}</span>
                  <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                  <span className="text-sm text-gray-500">{fmt(g.target_amount)}</span>
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>Resta: {fmt(remaining > 0 ? remaining : 0)}</span>
                  {monthly !== null && monthly > 0 && (
                    <span>Necesitas: {fmt(monthly)}/mes</span>
                  )}
                </div>

                {/* Formulario de deposito inline */}
                {depositGoalId === g.id && (
                  <form onSubmit={handleDeposit} className="mt-3 flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Monto a depositar"
                      required
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600">
                      Depositar
                    </button>
                    <button type="button" onClick={() => setDepositGoalId(null)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-300">
                      Cancelar
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
