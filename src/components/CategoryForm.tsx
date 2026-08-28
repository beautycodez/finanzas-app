"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const presetColors = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
];

export default function CategoryForm({ onSaved }: { onSaved?: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState(presetColors[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("categories").insert({
      name,
      type,
      color,
    });

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Categoria creada!");
      setName("");
      onSaved?.();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === "expense" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Gasto
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === "income" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Ingreso
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
        <div className="flex flex-wrap gap-2">
          {presetColors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-110"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Crear Categoria"}
      </button>
      {message && (
        <p className={`text-sm text-center ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>{message}</p>
      )}
    </form>
  );
}
