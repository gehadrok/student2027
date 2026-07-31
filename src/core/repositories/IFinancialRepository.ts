/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FeePayment, ExpenseRecord } from '../../types';

/**
 * Repository interface for Financial data access.
 */
export interface IFinancialRepository {
  getAllPayments(): FeePayment[];
  getAllExpenses(): ExpenseRecord[];
  savePayment(payment: FeePayment): FeePayment;
  saveExpense(expense: ExpenseRecord): ExpenseRecord;
}

