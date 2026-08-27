"use client";

import TransactionList from "@/components/TransactionList";

export default function TransactionsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Transacciones</h1>
      <TransactionList />
    </div>
  );
}
