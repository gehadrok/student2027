export interface PaymentEntity {
  id: string;
  studentId: string;
  studentName?: string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'paid' | 'partial' | 'overdue' | 'pending';
  receiptNumber?: string;
  paymentMethod?: 'cash' | 'card' | 'transfer';
}

export interface ExpenseEntity {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  approvedBy?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;
  totalExpenses: number;
  netProfit: number;
}
