"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const ALLOWED_EMAIL = "angelloruizlandauro12@gmail.com";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user && pathname !== "/login") {
      router.replace("/login");
      return;
    }

    if (user && user.email !== ALLOWED_EMAIL) {
      signOut();
      router.replace("/login");
      return;
    }

    if (user && pathname === "/login") {
      router.replace("/");
    }
  }, [user, loading, pathname, router, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!user && pathname !== "/login") return null;
  if (user && user.email !== ALLOWED_EMAIL) return null;
  if (user && pathname === "/login") return null;

  return <>{children}</>;
}
