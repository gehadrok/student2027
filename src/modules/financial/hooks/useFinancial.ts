import { useState, useCallback, useEffect } from 'react';
import { financialService } from '../services/financialService';
import { FeePayment, ExpenseRecord } from '../../../types';
import { FinancialSummary } from '../types';

export const useFinancial = () => {
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [paymentsData, expensesData, summaryData] = await Promise.all([
        financialService.getPayments(),
        financialService.getExpenses(),
        financialService.getSummary()
      ]);
      setPayments(paymentsData);
      setExpenses(expensesData);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Failed to load financial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const recordPayment = async (paymentId: string, amount: number, method: 'cash' | 'card' | 'transfer') => {
    const updated = await financialService.recordPayment(paymentId, amount, method);
    await refreshData();
    return updated;
  };

  return {
    payments,
    expenses,
    summary,
    isLoading,
    refreshData,
    recordPayment
  };
};
