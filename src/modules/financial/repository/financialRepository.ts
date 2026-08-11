/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IDataSource } from '../../../core/datasource/IDataSource';
import { IFinancialRepository } from '../../../core/repositories/IFinancialRepository';
import { FeePayment, ExpenseRecord } from '../../../types';
import { DataSourceFactory } from '../../../core/datasource/DataSourceFactory';

/**
 * Financial repository implementation.
 * Uses constructor-based dependency injection for the DataSource.
 * Violation fixed: no longer imports getRealmDB() from lib/db.
 */
export class FinancialRepository implements IFinancialRepository {
  private dataSource: IDataSource;

  constructor(dataSource?: IDataSource) {
    this.dataSource = dataSource || DataSourceFactory.getInstance();
  }

  async getAllPayments(): Promise<FeePayment[]> {
    const rows = await this.dataSource.query<any>(
      `SELECT id, student_id, receipt_number, title, total_amount, paid_amount, remaining_amount,
              due_date, paid_date, status, payment_method, notes
       FROM fee_payments ORDER BY due_date DESC`
    );

    return rows.map((r: any) => ({
      id: r.id,
      studentId: r.student_id,
      receiptNumber: r.receipt_number || undefined,
      title: r.title,
      totalAmount: r.total_amount,
      amount: r.total_amount,
      paidAmount: r.paid_amount,
      remainingAmount: r.remaining_amount,
      dueDate: r.due_date,
      paidDate: r.paid_date || undefined,
      status: r.status,
      paymentMethod: r.payment_method || undefined,
      notes: r.notes || undefined,
    }));
  }

  async getAllExpenses(): Promise<ExpenseRecord[]> {
    const rows = await this.dataSource.query<any>(
      `SELECT id, voucher_number, category, title, amount, date, beneficiary, approved_by, notes
       FROM expense_records ORDER BY date DESC`
    );

    return rows.map((r: any) => ({
      id: r.id,
      voucherNumber: r.voucher_number,
      category: r.category,
      title: r.title,
      amount: r.amount,
      date: r.date,
      beneficiary: r.beneficiary,
      approvedBy: r.approved_by,
      notes: r.notes || undefined,
    }));
  }

  async savePayment(payment: FeePayment): Promise<FeePayment> {
    const total = payment.totalAmount || payment.amount || 0;
    const paid = payment.paidAmount || 0;
    const remaining = total - paid;

    await this.dataSource.execute(
      `INSERT OR REPLACE INTO fee_payments (
        id, student_id, receipt_number, title, total_amount, paid_amount, remaining_amount,
        due_date, paid_date, status, payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.id,
        payment.studentId,
        payment.receiptNumber || null,
        payment.title,
        total,
        paid,
        remaining,
        payment.dueDate,
        payment.paidDate || null,
        payment.status,
        payment.paymentMethod || null,
        payment.notes || null,
      ]
    );

    return payment;
  }

  async saveExpense(expense: ExpenseRecord): Promise<ExpenseRecord> {
    await this.dataSource.execute(
      `INSERT OR REPLACE INTO expense_records (
        id, voucher_number, category, title, amount, date, beneficiary, approved_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.id,
        expense.voucherNumber,
        expense.category,
        expense.title,
        expense.amount,
        expense.date,
        expense.beneficiary,
        expense.approvedBy,
        expense.notes || null,
      ]
    );

    return expense;
  }
}

// Singleton instance with default DataSource
export const financialRepository = new FinancialRepository();

