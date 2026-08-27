"use client";

import AccountsManager from "@/components/AccountsManager";
import CategoriesManager from "@/components/CategoriesManager";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Admin</h1>
      <AccountsManager />
      <CategoriesManager />
    </div>
  );
}
