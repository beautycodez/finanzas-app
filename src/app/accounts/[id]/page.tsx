"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AccountTransactions from "@/components/AccountTransactions";
import type { Account } from "@/types";

const typeLabels: Record<string, string> = {
  checking: "Cuenta Corriente",
  savings: "Ahorros",
  credit_card: "Tarjeta de Credito",
  cash: "Efectivo",
  investment: "Inversiones",
};

const typeColors: Record<string, string> = {
  checking: "bg-blue-500",
  savings: "bg-green-500",
  credit_card: "bg-purple-500",
  cash: "bg-amber-500",
  investment: "bg-teal-500",
};

export default function AccountPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = Number(params.id);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccount();
  }, [accountId]);

  async function loadAccount() {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (data) {
      setAccount(data as Account);
    } else {
      router.push("/");
    }
    setLoading(false);
  }

  function formatCurrency(amount: number) {
    const cur = account?.currency || "USD";
    const locale = cur === "PEN" ? "es-PE" : "es-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Cargando...</div>;
  }

  if (!account) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Movimientos</h1>
      </div>

      {/* Card de cuenta */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className={`w-4 h-16 rounded-full ${typeColors[account.type] || "bg-gray-400"}`} />
          <div className="flex-1">
            <p className="text-sm text-gray-500">{typeLabels[account.type] || account.type}</p>
            <p className="text-xl font-bold text-gray-800">{account.name}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">Saldo disponible</p>
          <p className={`text-3xl font-bold ${account.balance >= 0 ? "text-gray-900" : "text-red-600"}`}>
            {formatCurrency(account.balance)}
          </p>
        </div>
      </div>

      {/* Movimientos */}
      <AccountTransactions accountId={accountId} currency={account.currency || "USD"} />
    </div>
  );
}
