"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/TransactionForm";
import AccountForm from "@/components/AccountForm";
import CategoryForm from "@/components/CategoryForm";

type ModalType = "transaction" | "account" | "category" | null;

export default function AddMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);

  function open(modalType: Exclude<ModalType, null>) {
    setMenuOpen(false);
    setModal(modalType);
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {menuOpen && (
          <>
            <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
            <div className="mb-3 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10 w-56">
              <button
                onClick={() => open("transaction")}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </span>
                Agregar Transaccion
              </button>
              <button
                onClick={() => open("account")}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h2m4 0h4M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </span>
                Agregar Cuenta
              </button>
              <button
                onClick={() => open("category")}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                </span>
                Agregar Categoria
              </button>
            </div>
          </>
        )}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center"
          title="Agregar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 transition-transform ${menuOpen ? "rotate-45" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Modals */}
      <Modal open={modal === "transaction"} title="Agregar Transaccion" onClose={() => setModal(null)}>
        <TransactionForm onTransactionAdded={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "account"} title="Agregar Cuenta" onClose={() => setModal(null)}>
        <AccountForm onSaved={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "category"} title="Agregar Categoria" onClose={() => setModal(null)}>
        <CategoryForm onSaved={() => setModal(null)} />
      </Modal>
    </>
  );
}
