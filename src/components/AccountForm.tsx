"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

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

export default function AccountForm({ onSaved }: { onSaved?: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [currency, setCurrency] = useState("PEN");
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("accounts").insert({
      name,
      type,
      currency,
      balance: Number(balance),
    });

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Cuenta creada!");
      setName("");
      setBalance("0");
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
          placeholder="Ej: Banco Interbank"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
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
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Saldo inicial</label>
        <input
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Crear Cuenta"}
      </button>
      {message && (
        <p className={`text-sm text-center ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>{message}</p>
      )}
    </form>
  );
}
