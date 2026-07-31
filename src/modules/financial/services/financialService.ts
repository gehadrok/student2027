import { financialRepository } from '../repository/financialRepository';
import { FeePayment, ExpenseRecord } from '../../../types';
import { FinancialSummary } from '../types';

export class FinancialService {
  getSummary(): FinancialSummary {
    const payments = financialRepository.getAllPayments();
    const expenses = financialRepository.getAllExpenses();

    const totalRevenue = payments.reduce((acc, p) => acc + p.totalAmount, 0);
    const collectedRevenue = payments.reduce((acc, p) => acc + p.paidAmount, 0);
    const pendingRevenue = payments.reduce((acc, p) => acc + (p.remainingAmount || (p.totalAmount - p.paidAmount)), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = collectedRevenue - totalExpenses;

    return {
      totalRevenue,
      collectedRevenue,
      pendingRevenue,
      totalExpenses,
      netProfit
    };
  }

  getPayments(): FeePayment[] {
    return financialRepository.getAllPayments();
  }

  getExpenses(): ExpenseRecord[] {
    return financialRepository.getAllExpenses();
  }

  recordPayment(paymentId: string, amountPaid: number, method: 'cash' | 'card' | 'transfer'): FeePayment | undefined {
    const payments = financialRepository.getAllPayments();
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return undefined;

    const newPaid = payment.paidAmount + amountPaid;
    const newRemaining = Math.max(0, payment.totalAmount - newPaid);
    const newStatus = newRemaining === 0 ? 'paid' : 'partial';

    const updated: FeePayment = {
      ...payment,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      paymentMethod: method,
      receiptNumber: 'REC-' + Math.floor(100000 + Math.random() * 900000)
    };

    return financialRepository.savePayment(updated);
  }
}

export const financialService = new FinancialService();
