import { useState, useCallback, useEffect } from 'react';
import { financialService } from '../services/financialService';
import { FeePayment, ExpenseRecord } from '../../../types';
import { FinancialSummary } from '../types';

export const useFinancial = () => {
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshData = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setPayments(financialService.getPayments());
      setExpenses(financialService.getExpenses());
      setSummary(financialService.getSummary());
      setIsLoading(false);
    }, 100);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const recordPayment = (paymentId: string, amount: number, method: 'cash' | 'card' | 'transfer') => {
    const updated = financialService.recordPayment(paymentId, amount, method);
    refreshData();
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
