import { useState, useCallback } from 'react';
import { getDb } from '../database/db';

export function useEmergencyFund() {
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchFund = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const row = await db.getFirstAsync('SELECT * FROM emergency_fund ORDER BY id LIMIT 1');
      if (row) {
        const target = row.target_months * row.monthly_expenses;
        const progress = target > 0 ? Math.min(1, row.current_amount / target) : 0;
        const enriched = { ...row, target_amount: target, progress };
        setFund(enriched);
        return enriched;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (targetMonths, monthlyExpenses, currency = 'USD') => {
    const db = getDb();
    const existing = await db.getFirstAsync('SELECT id FROM emergency_fund LIMIT 1');
    if (existing) {
      await db.runAsync(
        'UPDATE emergency_fund SET target_months=?, monthly_expenses=?, currency=?, updated_at=datetime("now") WHERE id=?',
        [parseFloat(targetMonths), parseFloat(monthlyExpenses), currency, existing.id]
      );
    } else {
      await db.runAsync(
        'INSERT INTO emergency_fund (target_months, monthly_expenses, current_amount, currency) VALUES (?,?,0,?)',
        [parseFloat(targetMonths), parseFloat(monthlyExpenses), currency]
      );
    }
  }, []);

  const addContribution = useCallback(async (amount) => {
    const db = getDb();
    const parsed = parseFloat(amount);
    const existing = await db.getFirstAsync('SELECT id FROM emergency_fund LIMIT 1');
    if (existing) {
      await db.runAsync(
        'UPDATE emergency_fund SET current_amount = current_amount + ?, updated_at=datetime("now") WHERE id=?',
        [parsed, existing.id]
      );
    }
  }, []);

  const withdraw = useCallback(async (amount) => {
    const db = getDb();
    const parsed = parseFloat(amount);
    const existing = await db.getFirstAsync('SELECT id FROM emergency_fund LIMIT 1');
    if (existing) {
      await db.runAsync(
        'UPDATE emergency_fund SET current_amount = MAX(0, current_amount - ?), updated_at=datetime("now") WHERE id=?',
        [parsed, existing.id]
      );
    }
  }, []);

  const isUnderfunded = useCallback((fundData) => {
    if (!fundData) return false;
    return fundData.progress < 1;
  }, []);

  return { fund, loading, fetchFund, updateConfig, addContribution, withdraw, isUnderfunded };
}
