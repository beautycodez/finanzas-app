"use client";

import { createContext, useContext, useState, ReactNode } from "react";

function getDefaultRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: first.toISOString().split("T")[0],
    to: last.toISOString().split("T")[0],
  };
}

interface DateFilterContextType {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  setPreset: (preset: string) => void;
  activePreset: string | null;
  clearPreset: () => void;
}

const DateFilterContext = createContext<DateFilterContextType>({
  from: "",
  to: "",
  setFrom: () => {},
  setTo: () => {},
  setPreset: () => {},
  activePreset: null,
  clearPreset: () => {},
});

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const defaults = getDefaultRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [activePreset, setActivePreset] = useState<string | null>("month");

  function setPreset(preset: string) {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    switch (preset) {
      case "today": {
        setFrom(today);
        setTo(today);
        break;
      }
      case "week": {
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        setFrom(monday.toISOString().split("T")[0]);
        setTo(today);
        break;
      }
      case "month": {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setFrom(first.toISOString().split("T")[0]);
        setTo(last.toISOString().split("T")[0]);
        break;
      }
      case "prevMonth": {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        setFrom(first.toISOString().split("T")[0]);
        setTo(last.toISOString().split("T")[0]);
        break;
      }
      case "quarter": {
        const q = Math.floor(now.getMonth() / 3);
        const first = new Date(now.getFullYear(), q * 3, 1);
        const last = new Date(now.getFullYear(), q * 3 + 3, 0);
        setFrom(first.toISOString().split("T")[0]);
        setTo(last.toISOString().split("T")[0]);
        break;
      }
      case "year": {
        const first = new Date(now.getFullYear(), 0, 1);
        const last = new Date(now.getFullYear(), 11, 31);
        setFrom(first.toISOString().split("T")[0]);
        setTo(last.toISOString().split("T")[0]);
        break;
      }
      case "all": {
        setFrom("2020-01-01");
        setTo(today);
        break;
      }
    }

    setActivePreset(preset);
  }

  function clearPreset() {
    setActivePreset(null);
  }

  return (
    <DateFilterContext.Provider value={{ from, to, setFrom, setTo, setPreset, activePreset, clearPreset }}>
      {children}
    </DateFilterContext.Provider>
  );
}

export const useDateFilter = () => useContext(DateFilterContext);
