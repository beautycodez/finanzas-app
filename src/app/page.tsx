"use client";

import Dashboard from "@/components/Dashboard";
import AccountBalances from "@/components/AccountBalances";
import TransactionList from "@/components/TransactionList";

export default function Home() {
  return (
    <div className="space-y-6">
      <Dashboard />
      <AccountBalances />
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Ultimas transacciones</h2>
        <TransactionList />
      </div>
    </div>
  );
}
