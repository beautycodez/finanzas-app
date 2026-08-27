"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FloatingAddButton() {
  const pathname = usePathname();
  if (pathname === "/add") return null;

  return (
    <Link
      href="/add"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center"
      title="Agregar transaccion"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </Link>
  );
}
