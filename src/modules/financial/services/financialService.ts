import { financialRepository } from '../repository/financialRepository';
import { FeePayment, ExpenseRecord } from '../../../types';
import { FinancialSummary } from '../types';

export class FinancialService {
  async getSummary(): Promise<FinancialSummary> {
    const payments = await financialRepository.getAllPayments();
    const expenses = await financialRepository.getAllExpenses();

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

  async getPayments(): Promise<FeePayment[]> {
    return financialRepository.getAllPayments();
  }

  async getExpenses(): Promise<ExpenseRecord[]> {
    return financialRepository.getAllExpenses();
  }

  async recordPayment(paymentId: string, amountPaid: number, method: 'cash' | 'card' | 'transfer'): Promise<FeePayment | undefined> {
    const payments = await financialRepository.getAllPayments();
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
