/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FeePayment, ExpenseRecord } from '../../types';

/**
 * Repository interface for Financial data access.
 */
export interface IFinancialRepository {
  getAllPayments(): Promise<FeePayment[]>;
  getAllExpenses(): Promise<ExpenseRecord[]>;
  savePayment(payment: FeePayment): Promise<FeePayment>;
  saveExpense(expense: ExpenseRecord): Promise<ExpenseRecord>;
}

