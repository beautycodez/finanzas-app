"use client";

import Link from "next/link";
import Dashboard from "@/components/Dashboard";
import AccountBalances from "@/components/AccountBalances";
import TransactionList from "@/components/TransactionList";

export default function Home() {
  return (
    <div className="space-y-6">
      <Dashboard />
      <AccountBalances />
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Ultimas transacciones</h2>
          <Link
            href="/transactions"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Ver mas
          </Link>
        </div>
        <TransactionList limit={5} />
      </div>
    </div>
  );
}
