import { useState, useCallback } from 'react';
import { getDb } from '../database/db';
import { calculate502030 } from '../utils/calculations';

export function useBudget() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBudgets = useCallback(async (month, year) => {
    setLoading(true);
    try {
      const db = getDb();
      const m = String(month).padStart(2, '0');
      const y = String(year);

      const budgetRows = await db.getAllAsync(
        'SELECT * FROM budgets WHERE month=? AND year=?',
        [month, year]
      );

      // Group spent by category+currency so each budget matches its own currency
      const spentRows = await db.getAllAsync(
        `SELECT category, COALESCE(currency,'USD') as currency, SUM(amount) as spent
         FROM transactions WHERE type='expense' AND strftime('%m',date)=? AND strftime('%Y',date)=?
         GROUP BY category, currency`,
        [m, y]
      );

      const spentMap = {};
      for (const r of spentRows) spentMap[`${r.category}|${r.currency}`] = r.spent;

      const result = budgetRows.map(b => {
        const budgetCurrency = b.currency || 'USD';
        const spent = spentMap[`${b.category_id}|${budgetCurrency}`] || 0;
        return { ...b, spent, progress: b.limit_amount > 0 ? spent / b.limit_amount : 0 };
      });

      setBudgets(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const setBudgetLimit = useCallback(async (categoryId, month, year, limitAmount, currency = 'USD') => {
    const db = getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO budgets (category_id, month, year, limit_amount, currency) VALUES (?,?,?,?,?)',
      [categoryId, month, year, parseFloat(limitAmount), currency]
    );
  }, []);

  const deleteBudget = useCallback(async (id) => {
    const db = getDb();
    await db.runAsync('DELETE FROM budgets WHERE id=?', [id]);
  }, []);

  const applyRule502030 = useCallback(async (monthlyIncome, month, year, currency = 'USD') => {
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
          'INSERT OR REPLACE INTO budgets (category_id, month, year, limit_amount, currency) VALUES (?,?,?,?,?)',
          [c.id, month, year, Math.round(needs * c.pct), currency]
        );
      }
      const wants = monthlyIncome * 0.3;
      for (const c of wantsCategories) {
        await db.runAsync(
          'INSERT OR REPLACE INTO budgets (category_id, month, year, limit_amount, currency) VALUES (?,?,?,?,?)',
          [c.id, month, year, Math.round(wants * c.pct), currency]
        );
      }
    });
  }, []);

  const getTotalBudgetSummary = useCallback(async (month, year, currency) => {
    const db = getDb();
    const m = String(month).padStart(2, '0');
    const y = String(year);
    const budgetCurrFilter = currency ? ' AND currency=?' : '';
    const budgetCurrParam = currency ? [currency] : [];
    const txCurrFilter = currency ? ' AND currency=?' : '';
    const txCurrParam = currency ? [currency] : [];

    const [totalBudget, totalSpent] = await Promise.all([
      db.getFirstAsync(
        `SELECT COALESCE(SUM(limit_amount),0) as t FROM budgets WHERE month=? AND year=?${budgetCurrFilter}`,
        [month, year, ...budgetCurrParam]
      ),
      db.getFirstAsync(
        `SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='expense' AND strftime('%m',date)=? AND strftime('%Y',date)=?${txCurrFilter}`,
        [m, y, ...txCurrParam]
      ),
    ]);

    return {
      budgeted: totalBudget?.t || 0,
      spent: totalSpent?.t || 0,
      remaining: (totalBudget?.t || 0) - (totalSpent?.t || 0),
    };
  }, []);

  const getOverBudgetCategories = useCallback(async (month, year) => {
    const list = await fetchBudgets(month, year);
    return list.filter(b => b.progress >= 0.8);
  }, [fetchBudgets]);

  return {
    budgets, loading,
    fetchBudgets, setBudgetLimit, deleteBudget,
    applyRule502030, getTotalBudgetSummary, getOverBudgetCategories,
  };
}
