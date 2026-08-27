"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useDateFilter } from "@/lib/dateFilter";

interface Row {
  id: string;
  category: string;
  color: string;
  budgeted: number;
  actual: number;
  isCategory: boolean;
  isTotal: boolean;
  group: "income" | "expense";
}

export default function IncomeStatementPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { from, to } = useDateFilter();

  useEffect(() => {
    loadData();
  }, [from, to]);

  async function loadData() {
    setLoading(true);

    const [transactionsRes, budgetsRes, categoriesRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount, type, category_id, categories(name, color)")
        .gte("transaction_date", from)
        .lte("transaction_date", to),
      supabase
        .from("budgets")
        .select("category_id, amount, year, month")
        .gte("year", new Date(from).getFullYear())
        .lte("year", new Date(to).getFullYear()),
      supabase
        .from("categories")
        .select("id, name, type, color")
        .order("name"),
    ]);

    const txns = transactionsRes.data || [];
    const budgets = budgetsRes.data || [];
    const categories = categoriesRes.data || [];

    // Calculate actuals per category
    const actualMap: Record<number, { income: number; expense: number }> = {};
    for (const t of txns) {
      const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
      const catId = t.category_id;
      if (!actualMap[catId]) actualMap[catId] = { income: 0, expense: 0 };
      if (t.type === "income") actualMap[catId].income += t.amount;
      else if (t.type === "expense") actualMap[catId].expense += t.amount;
    }

    // Calculate budget per category
    const budgetMap: Record<number, number> = {};
    for (const b of budgets) {
      budgetMap[b.category_id] = (budgetMap[b.category_id] || 0) + b.amount;
    }

    // Build rows
    const newRows: Row[] = [];

    // Income section
    const incomeCategories = categories.filter((c) => c.type === "income");
    let totalIncomeBudgeted = 0;
    let totalIncomeActual = 0;

    for (const cat of incomeCategories) {
      const actual = actualMap[cat.id]?.income || 0;
      const budgeted = budgetMap[cat.id] || 0;
      if (actual === 0 && budgeted === 0) continue;
      totalIncomeBudgeted += budgeted;
      totalIncomeActual += actual;
      newRows.push({
        id: `inc-${cat.id}`,
        category: cat.name,
        color: cat.color || "#94a3b8",
        budgeted,
        actual,
        isCategory: true,
        isTotal: false,
        group: "income",
      });
    }

    newRows.push({
      id: "total-income",
      category: "Total Ingresos",
      color: "#22c55e",
      budgeted: totalIncomeBudgeted,
      actual: totalIncomeActual,
      isCategory: false,
      isTotal: true,
      group: "income",
    });

    // Expense section
    const expenseCategories = categories.filter((c) => c.type === "expense");
    let totalExpenseBudgeted = 0;
    let totalExpenseActual = 0;

    for (const cat of expenseCategories) {
      const actual = actualMap[cat.id]?.expense || 0;
      const budgeted = budgetMap[cat.id] || 0;
      if (actual === 0 && budgeted === 0) continue;
      totalExpenseBudgeted += budgeted;
      totalExpenseActual += actual;
      newRows.push({
        id: `exp-${cat.id}`,
        category: cat.name,
        color: cat.color || "#94a3b8",
        budgeted,
        actual,
        isCategory: true,
        isTotal: false,
        group: "expense",
      });
    }

    newRows.push({
      id: "total-expense",
      category: "Total Gastos",
      color: "#ef4444",
      budgeted: totalExpenseBudgeted,
      actual: totalExpenseActual,
      isCategory: false,
      isTotal: true,
      group: "expense",
    });

    // Net income row
    newRows.push({
      id: "net-income",
      category: "Ingreso Neto",
      color: "#3b82f6",
      budgeted: totalIncomeBudgeted - totalExpenseBudgeted,
      actual: totalIncomeActual - totalExpenseActual,
      isCategory: false,
      isTotal: true,
      group: "income",
    });

    setRows(newRows);
    setLoading(false);
  }

  function startEdit(rowId: string, field: "budgeted" | "actual", value: number) {
    setEditingCell(`${rowId}-${field}`);
    setEditValue(String(value || ""));
  }

  async function saveEdit(rowId: string, field: "budgeted" | "actual") {
    const numValue = Number(editValue) || 0;

    if (field === "budgeted") {
      // Save to budgets table
      const parts = rowId.split("-");
      if (parts[0] === "inc" || parts[0] === "exp") {
        const catId = Number(parts[1]);
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const { data: existing } = await supabase
          .from("budgets")
          .select("id")
          .eq("category_id", catId)
          .eq("year", year)
          .eq("month", month)
          .single();

        if (existing) {
          await supabase.from("budgets").update({ amount: numValue }).eq("id", existing.id);
        } else {
          await supabase.from("budgets").insert({
            category_id: catId,
            amount: numValue,
            period: "monthly",
            year,
            month,
          });
        }
      }
    }

    // Update local state and recalculate totals
    setRows((prev) => {
      const updated = prev.map((r) => {
        if (r.id === rowId) {
          return { ...r, [field]: numValue };
        }
        return r;
      });

      // Recalculate totals
      const incomeRows = updated.filter((r) => r.group === "income" && r.isCategory);
      const expenseRows = updated.filter((r) => r.group === "expense" && r.isCategory);

      const totalIncBudget = incomeRows.reduce((s, r) => s + r.budgeted, 0);
      const totalIncActual = incomeRows.reduce((s, r) => s + r.actual, 0);
      const totalExpBudget = expenseRows.reduce((s, r) => s + r.budgeted, 0);
      const totalExpActual = expenseRows.reduce((s, r) => s + r.actual, 0);

      return updated.map((r) => {
        if (r.id === "total-income") return { ...r, budgeted: totalIncBudget, actual: totalIncActual };
        if (r.id === "total-expense") return { ...r, budgeted: totalExpBudget, actual: totalExpActual };
        if (r.id === "net-income") return { ...r, budgeted: totalIncBudget - totalExpBudget, actual: totalIncActual - totalExpActual };
        return r;
      });
    });

    setEditingCell(null);
    setEditValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent, rowId: string, field: "budgeted" | "actual") {
    if (e.key === "Enter") saveEdit(rowId, field);
    if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
  }

  function fmt(n: number) {
    return new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  function variance(budgeted: number, actual: number) {
    return actual - budgeted;
  }

  function variancePct(budgeted: number, actual: number) {
    if (budgeted === 0) return actual > 0 ? 100 : 0;
    return ((actual - budgeted) / budgeted) * 100;
  }

  const dateLabel = from === to
    ? new Date(from + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : `${new Date(from + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })} — ${new Date(to + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Cargando estado de resultados...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Estado de Resultados</h1>
        <p className="text-sm text-gray-500">{dateLabel}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[40%]">Concepto</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Presupuestado</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Real</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Variacion</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">% Var</th>
            </tr>
          </thead>
          <tbody>
            {/* INCOME HEADER */}
            <tr className="bg-green-50">
              <td colSpan={5} className="px-4 py-2 font-bold text-green-800 uppercase text-xs tracking-wider">
                Ingresos
              </td>
            </tr>

            {rows.filter((r) => r.group === "income" && r.isCategory).map((row) => {
              const v = variance(row.budgeted, row.actual);
              const vp = variancePct(row.budgeted, row.actual);
              return (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="text-gray-800">{row.category}</span>
                    </div>
                  </td>
                  <Cell value={row.budgeted} rowId={row.id} field="budgeted" editingCell={editingCell} editValue={editValue}
                    onStartEdit={startEdit} onSave={saveEdit} onKey={handleKeyDown} onChange={setEditValue} />
                  <Cell value={row.actual} rowId={row.id} field="actual" editingCell={editingCell} editValue={editValue}
                    onStartEdit={startEdit} onSave={saveEdit} onKey={handleKeyDown} onChange={setEditValue} />
                  <td className={`text-right px-4 py-2.5 font-medium ${v >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {v >= 0 ? "+" : ""}{fmt(v)}
                  </td>
                  <td className={`text-right px-4 py-2.5 text-xs ${vp >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {vp >= 0 ? "+" : ""}{vp.toFixed(1)}%
                  </td>
                </tr>
              );
            })}

            {/* TOTAL INCOME */}
            {rows.filter((r) => r.id === "total-income").map((row) => (
              <tr key={row.id} className="bg-green-100 border-b border-green-200 font-bold">
                <td className="px-4 py-3 text-green-900">{row.category}</td>
                <td className="text-right px-4 py-3 text-green-900">{fmt(row.budgeted)}</td>
                <td className="text-right px-4 py-3 text-green-900">{fmt(row.actual)}</td>
                <td className={`text-right px-4 py-3 ${variance(row.budgeted, row.actual) >= 0 ? "text-green-900" : "text-red-700"}`}>
                  {variance(row.budgeted, row.actual) >= 0 ? "+" : ""}{fmt(variance(row.budgeted, row.actual))}
                </td>
                <td className="text-right px-4 py-3 text-green-900">
                  {variancePct(row.budgeted, row.actual).toFixed(1)}%
                </td>
              </tr>
            ))}

            {/* EXPENSE HEADER */}
            <tr className="bg-red-50">
              <td colSpan={5} className="px-4 py-2 font-bold text-red-800 uppercase text-xs tracking-wider">
                Gastos
              </td>
            </tr>

            {rows.filter((r) => r.group === "expense" && r.isCategory).map((row) => {
              const v = variance(row.budgeted, row.actual);
              const vp = variancePct(row.budgeted, row.actual);
              return (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="text-gray-800">{row.category}</span>
                    </div>
                  </td>
                  <Cell value={row.budgeted} rowId={row.id} field="budgeted" editingCell={editingCell} editValue={editValue}
                    onStartEdit={startEdit} onSave={saveEdit} onKey={handleKeyDown} onChange={setEditValue} />
                  <Cell value={row.actual} rowId={row.id} field="actual" editingCell={editingCell} editValue={editValue}
                    onStartEdit={startEdit} onSave={saveEdit} onKey={handleKeyDown} onChange={setEditValue} />
                  <td className={`text-right px-4 py-2.5 font-medium ${v <= 0 ? "text-green-600" : "text-red-600"}`}>
                    {v >= 0 ? "+" : ""}{fmt(v)}
                  </td>
                  <td className={`text-right px-4 py-2.5 text-xs ${vp <= 0 ? "text-green-600" : "text-red-600"}`}>
                    {vp >= 0 ? "+" : ""}{vp.toFixed(1)}%
                  </td>
                </tr>
              );
            })}

            {/* TOTAL EXPENSE */}
            {rows.filter((r) => r.id === "total-expense").map((row) => (
              <tr key={row.id} className="bg-red-100 border-b border-red-200 font-bold">
                <td className="px-4 py-3 text-red-900">{row.category}</td>
                <td className="text-right px-4 py-3 text-red-900">{fmt(row.budgeted)}</td>
                <td className="text-right px-4 py-3 text-red-900">{fmt(row.actual)}</td>
                <td className={`text-right px-4 py-3 ${variance(row.budgeted, row.actual) <= 0 ? "text-green-900" : "text-red-700"}`}>
                  {variance(row.budgeted, row.actual) >= 0 ? "+" : ""}{fmt(variance(row.budgeted, row.actual))}
                </td>
                <td className="text-right px-4 py-3 text-red-900">
                  {variancePct(row.budgeted, row.actual).toFixed(1)}%
                </td>
              </tr>
            ))}

            {/* NET INCOME */}
            {rows.filter((r) => r.id === "net-income").map((row) => {
              const isPositive = row.actual >= 0;
              return (
                <tr key={row.id} className={`${isPositive ? "bg-blue-100 border-blue-200" : "bg-amber-100 border-amber-200"} border-t-2 font-bold`}>
                  <td className={`px-4 py-4 text-lg ${isPositive ? "text-blue-900" : "text-amber-900"}`}>{row.category}</td>
                  <td className={`text-right px-4 py-4 text-lg ${isPositive ? "text-blue-900" : "text-amber-900"}`}>{fmt(row.budgeted)}</td>
                  <td className={`text-right px-4 py-4 text-lg ${isPositive ? "text-blue-900" : "text-amber-900"}`}>{fmt(row.actual)}</td>
                  <td className={`text-right px-4 py-4 text-lg ${isPositive ? "text-blue-900" : "text-amber-900"}`}>
                    {variance(row.budgeted, row.actual) >= 0 ? "+" : ""}{fmt(variance(row.budgeted, row.actual))}
                  </td>
                  <td className={`text-right px-4 py-4 text-lg ${isPositive ? "text-blue-900" : "text-amber-900"}`}>
                    {variancePct(row.budgeted, row.actual).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Click en las celdas de "Presupuestado" para editar. Los cambios se guardan automaticamente.
      </p>
    </div>
  );
}

// Editable cell component
function Cell({
  value, rowId, field, editingCell, editValue, onStartEdit, onSave, onKey, onChange,
}: {
  value: number;
  rowId: string;
  field: "budgeted" | "actual";
  editingCell: string | null;
  editValue: string;
  onStartEdit: (rowId: string, field: "budgeted" | "actual", value: number) => void;
  onSave: (rowId: string, field: "budgeted" | "actual") => void;
  onKey: (e: React.KeyboardEvent, rowId: string, field: "budgeted" | "actual") => void;
  onChange: (v: string) => void;
}) {
  const cellId = `${rowId}-${field}`;
  const isEditing = editingCell === cellId;
  const isBudgeted = field === "budgeted";

  function fmt(n: number) {
    return new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  if (isEditing) {
    return (
      <td className="px-2 py-1">
        <input
          type="number"
          step="0.01"
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => onKey(e, rowId, field)}
          onBlur={() => onSave(rowId, field)}
          autoFocus
          className="w-full border border-blue-400 rounded px-2 py-1 text-right text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 bg-blue-50"
        />
      </td>
    );
  }

  return (
    <td
      className={`text-right px-4 py-2.5 ${isBudgeted ? "cursor-pointer hover:bg-blue-50 text-gray-600" : "text-gray-800"}`}
      onClick={() => isBudgeted && onStartEdit(rowId, field, value)}
      title={isBudgeted ? "Click para editar" : undefined}
    >
      {fmt(value)}
    </td>
  );
}
