export interface Account {
  id: number;
  name: string;
  type: "checking" | "savings" | "credit_card" | "cash" | "investment" | "payable";
  currency: string;
  balance: number;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
}

export interface Transaction {
  id: number;
  account_id: number;
  category_id: number | null;
  amount: number;
  type: "income" | "expense" | "transfer";
  description: string | null;
  transfer_from: number | null;
  transfer_to: number | null;
  transaction_date: string;
  created_at: string;
  categories?: Category;
  accounts?: Account;
}

export interface Budget {
  id: number;
  category_id: number;
  amount: number;
  period: "monthly" | "yearly";
  year: number;
  month: number | null;
  categories?: Category;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
}

export interface Recurring {
  id: number;
  account_id: number;
  category_id: number;
  amount: number;
  type: "income" | "expense";
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date: string | null;
  description: string | null;
  categories?: Category;
  accounts?: Account;
}
