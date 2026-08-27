"use client";

import { useRouter } from "next/navigation";
import TransactionForm from "@/components/TransactionForm";
import AccountBalances from "@/components/AccountBalances";

export default function AddPage() {
  const router = useRouter();

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Nueva Transaccion</h1>
      <AccountBalances />
      <TransactionForm onTransactionAdded={() => router.refresh()} />
    </div>
  );
}
