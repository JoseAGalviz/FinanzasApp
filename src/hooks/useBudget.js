import { useState, useCallback } from 'react';
import { getDb } from '../database/db';
import { calculate502030 } from '../utils/calculations';

export function useBudget() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBudgets = useCallback(async (month, year, currency) => {
    setLoading(true);
    try {
      const db = getDb();
      const m = String(month).padStart(2, '0');
      const y = String(year);
      const currFilter = currency ? ' AND currency=?' : '';
      const currParam = currency ? [currency] : [];

      const budgetRows = await db.getAllAsync(
        'SELECT * FROM budgets WHERE month=? AND year=?',
        [month, year]
      );

      const spentRows = await db.getAllAsync(
        `SELECT category, SUM(amount) as spent FROM transactions WHERE type='expense' AND strftime('%m',date)=? AND strftime('%Y',date)=?${currFilter} GROUP BY category`,
        [m, y, ...currParam]
      );

      const spentMap = {};
      for (const r of spentRows) spentMap[r.category] = r.spent;

      const result = budgetRows.map(b => ({
        ...b,
        spent: spentMap[b.category_id] || 0,
        progress: b.limit_amount > 0 ? (spentMap[b.category_id] || 0) / b.limit_amount : 0,
      }));

      setBudgets(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const setBudgetLimit = useCallback(async (categoryId, month, year, limitAmount) => {
    const db = getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO budgets (category_id, month, year, limit_amount) VALUES (?,?,?,?)',
      [categoryId, month, year, parseFloat(limitAmount)]
    );
  }, []);

  const deleteBudget = useCallback(async (id) => {
    const db = getDb();
    await db.runAsync('DELETE FROM budgets WHERE id=?', [id]);
  }, []);

  const applyRule502030 = useCallback(async (monthlyIncome, month, year) => {
    const { needs, savings } = calculate502030(monthlyIncome);
    const db = getDb();

    const needsCategories = [
      { id: 'housing', pct: 0.30 },
      { id: 'food', pct: 0.20 },
      { id: 'utilities', pct: 0.10 },
      { id: 'transport', pct: 0.15 },
      { id: 'health', pct: 0.10 },
      { id: 'other', pct: 0.15 },
    ];

    const wantsCategories = [
      { id: 'entertainment', pct: 0.40 },
      { id: 'clothing', pct: 0.30 },
      { id: 'subscriptions', pct: 0.15 },
      { id: 'personal', pct: 0.15 },
    ];

    await db.withTransactionAsync(async () => {
      for (const c of needsCategories) {
        await db.runAsync(
          'INSERT OR REPLACE INTO budgets (category_id, month, year, limit_amount) VALUES (?,?,?,?)',
          [c.id, month, year, Math.round(needs * c.pct)]
        );
      }
      const wants = monthlyIncome * 0.3;
      for (const c of wantsCategories) {
        await db.runAsync(
          'INSERT OR REPLACE INTO budgets (category_id, month, year, limit_amount) VALUES (?,?,?,?)',
          [c.id, month, year, Math.round(wants * c.pct)]
        );
      }
    });
  }, []);

  const getTotalBudgetSummary = useCallback(async (month, year, currency) => {
    const db = getDb();
    const m = String(month).padStart(2, '0');
    const y = String(year);
    const currFilter = currency ? ' AND currency=?' : '';
    const currParam = currency ? [currency] : [];

    const [totalBudget, totalSpent] = await Promise.all([
      db.getFirstAsync('SELECT COALESCE(SUM(limit_amount),0) as t FROM budgets WHERE month=? AND year=?', [month, year]),
      db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='expense' AND strftime('%m',date)=? AND strftime('%Y',date)=?${currFilter}`, [m, y, ...currParam]),
    ]);

    return {
      budgeted: totalBudget?.t || 0,
      spent: totalSpent?.t || 0,
      remaining: (totalBudget?.t || 0) - (totalSpent?.t || 0),
    };
  }, []);

  const getOverBudgetCategories = useCallback(async (month, year, currency) => {
    const list = await fetchBudgets(month, year, currency);
    return list.filter(b => b.progress >= 0.8);
  }, [fetchBudgets]);

  return {
    budgets, loading,
    fetchBudgets, setBudgetLimit, deleteBudget,
    applyRule502030, getTotalBudgetSummary, getOverBudgetCategories,
  };
}
