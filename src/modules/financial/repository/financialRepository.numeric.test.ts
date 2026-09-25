/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-4.4 numeric-semantics audit regression test.
 *
 * PostgreSQL's `pg` driver returns NUMERIC/DECIMAL columns as JavaScript
 * strings, whereas SQLite returns them as numbers. This test pins the
 * behaviour that FinancialRepository normalizes money columns to JS numbers
 * regardless of the underlying driver, so downstream arithmetic (e.g. the
 * dashboard KPI sums) is correct on PostgreSQL.
 *
 * Uses a fake IDataSource (no live database required).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FinancialRepository } from './financialRepository';
import { IDataSource } from '../../../core/datasource/IDataSource';

function fakeDs(rows: any[]): IDataSource {
  return {
    query: async () => rows,
    queryOne: async () => (rows[0] ?? null),
    execute: async () => ({ changes: 1, lastInsertRowid: 0 }),
    count: async () => rows.length,
    exists: async () => rows.length > 0,
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => undefined,
    prepare: async () => ({ run: () => undefined, free: () => undefined }),
    transaction: async () => ({ success: true }),
  } as unknown as IDataSource;
}

describe('FinancialRepository NUMERIC coercion (PG-4.4 audit regression)', () => {
  it('coerces fee_payments money columns to JS numbers (pg returns strings)', async () => {
    const ds = fakeDs([
      {
        id: 'p1', student_id: 's1', receipt_number: null, title: 'Tuition',
        total_amount: '1000.00', paid_amount: '400.00', remaining_amount: '600.00',
        due_date: '2025-01-01', paid_date: null, status: 'partial',
        payment_method: null, notes: null,
      },
    ]);
    const repo = new FinancialRepository(ds);
    const payments = await repo.getAllPayments();
    assert.equal(typeof payments[0].totalAmount, 'number');
    assert.equal(payments[0].totalAmount, 1000);
    assert.equal(payments[0].paidAmount, 400);
    assert.equal(payments[0].remainingAmount, 600);
  });

  it('coerces expense_records.amount to a JS number', async () => {
    const ds = fakeDs([
      {
        id: 'e1', voucher_number: 'V1', category: 'أخرى', title: 'Electricity',
        amount: '50.00', date: '2025-01-01', beneficiary: 'Co', approved_by: 'Admin',
        notes: null,
      },
    ]);
    const repo = new FinancialRepository(ds);
    const expenses = await repo.getAllExpenses();
    assert.equal(typeof expenses[0].amount, 'number');
    assert.equal(expenses[0].amount, 50);
  });
});
