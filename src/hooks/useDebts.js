import { useState, useCallback } from 'react';
import { getDb } from '../database/db';
import { calculateDebtPayoff } from '../utils/calculations';

export function useDebts() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const rows = await db.getAllAsync('SELECT * FROM debts ORDER BY interest_rate DESC');
      setDebts(rows);
      return rows;
    } finally {
      setLoading(false);
    }
  }, []);

  const addDebt = useCallback(async (data) => {
    const db = getDb();
    const result = await db.runAsync(
      'INSERT INTO debts (name, total_amount, remaining_amount, interest_rate, minimum_payment, due_date, strategy) VALUES (?,?,?,?,?,?,?)',
      [data.name, parseFloat(data.total_amount), parseFloat(data.remaining_amount), parseFloat(data.interest_rate) || 0, parseFloat(data.minimum_payment) || 0, data.due_date || null, data.strategy || 'avalanche']
    );
    return result.lastInsertRowId;
  }, []);

  const updateDebt = useCallback(async (id, data) => {
    const db = getDb();
    await db.runAsync(
      'UPDATE debts SET name=?, total_amount=?, remaining_amount=?, interest_rate=?, minimum_payment=?, due_date=?, strategy=? WHERE id=?',
      [data.name, parseFloat(data.total_amount), parseFloat(data.remaining_amount), parseFloat(data.interest_rate) || 0, parseFloat(data.minimum_payment) || 0, data.due_date || null, data.strategy || 'avalanche', id]
    );
  }, []);

  const deleteDebt = useCallback(async (id) => {
    const db = getDb();
    await db.runAsync('DELETE FROM debts WHERE id=?', [id]);
  }, []);

  const addPayment = useCallback(async (debtId, amount, date, note) => {
    const db = getDb();
    const parsed = parseFloat(amount);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'INSERT INTO debt_payments (debt_id, amount, date, note) VALUES (?,?,?,?)',
        [debtId, parsed, date, note || null]
      );
      await db.runAsync(
        'UPDATE debts SET remaining_amount = MAX(0, remaining_amount - ?) WHERE id=?',
        [parsed, debtId]
      );
    });
  }, []);

  const getPayments = useCallback(async (debtId) => {
    const db = getDb();
    return await db.getAllAsync(
      'SELECT * FROM debt_payments WHERE debt_id=? ORDER BY date DESC',
      [debtId]
    );
  }, []);

  const getStrategies = useCallback(async (extraPayment = 0) => {
    const db = getDb();
    const allDebts = await db.getAllAsync('SELECT * FROM debts WHERE remaining_amount > 0');
    const avalanche = calculateDebtPayoff(allDebts, extraPayment, 'avalanche');
    const snowball = calculateDebtPayoff(allDebts, extraPayment, 'snowball');
    return { avalanche, snowball };
  }, []);

  const getTotalDebt = useCallback(async () => {
    const db = getDb();
    const row = await db.getFirstAsync('SELECT COALESCE(SUM(remaining_amount),0) as total FROM debts');
    return row?.total || 0;
  }, []);

  const getUpcomingPayments = useCallback(async (daysAhead = 7) => {
    const db = getDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return await db.getAllAsync(
      'SELECT * FROM debts WHERE due_date IS NOT NULL AND due_date <= ? AND remaining_amount > 0 ORDER BY due_date ASC',
      [cutoffStr]
    );
  }, []);

  return {
    debts, loading,
    fetchDebts, addDebt, updateDebt, deleteDebt,
    addPayment, getPayments, getStrategies, getTotalDebt, getUpcomingPayments,
  };
}
