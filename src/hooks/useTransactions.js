import { useState, useCallback } from 'react';
import { getDb } from '../database/db';

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const db = getDb();
      let sql = 'SELECT * FROM transactions WHERE 1=1';
      const params = [];

      if (filters.month && filters.year) {
        sql += " AND strftime('%m', date) = ? AND strftime('%Y', date) = ?";
        params.push(String(filters.month).padStart(2, '0'), String(filters.year));
      }
      if (filters.type) { sql += ' AND type = ?'; params.push(filters.type); }
      if (filters.category) { sql += ' AND category = ?'; params.push(filters.category); }
      if (filters.currency) { sql += ' AND currency = ?'; params.push(filters.currency); }
      if (filters.minAmount) { sql += ' AND amount >= ?'; params.push(filters.minAmount); }
      if (filters.maxAmount) { sql += ' AND amount <= ?'; params.push(filters.maxAmount); }
      if (filters.startDate) { sql += ' AND date >= ?'; params.push(filters.startDate); }
      if (filters.endDate) { sql += ' AND date <= ?'; params.push(filters.endDate); }

      sql += ' ORDER BY date DESC, created_at DESC';
      if (filters.limit) { sql += ' LIMIT ?'; params.push(filters.limit); }

      const rows = await db.getAllAsync(sql, params);
      setTransactions(rows);
      return rows;
    } catch (e) {
      setError(e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addTransaction = useCallback(async (data) => {
    const db = getDb();
    const result = await db.runAsync(
      'INSERT INTO transactions (type, amount, category, description, date, is_recurring, receipt_uri, currency, usd_equivalent) VALUES (?,?,?,?,?,?,?,?,?)',
      [data.type, parseFloat(data.amount), data.category, data.description || null, data.date, data.is_recurring ? 1 : 0, data.receipt_uri || null, data.currency || 'USD', data.usd_equivalent ?? null]
    );
    return result.lastInsertRowId;
  }, []);

  const updateTransaction = useCallback(async (id, data) => {
    const db = getDb();
    await db.runAsync(
      'UPDATE transactions SET type=?, amount=?, category=?, description=?, date=?, is_recurring=?, receipt_uri=?, currency=?, usd_equivalent=? WHERE id=?',
      [data.type, parseFloat(data.amount), data.category, data.description || null, data.date, data.is_recurring ? 1 : 0, data.receipt_uri || null, data.currency || 'USD', data.usd_equivalent ?? null, id]
    );
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    const db = getDb();
    await db.runAsync('DELETE FROM transactions WHERE id=?', [id]);
  }, []);

  const getMonthSummary = useCallback(async (month, year, currency) => {
    const db = getDb();
    const m = String(month).padStart(2, '0');
    const y = String(year);
    const currFilter = currency ? ' AND currency=?' : '';
    const currParam = currency ? [currency] : [];

    const [income, expense] = await Promise.all([
      db.getFirstAsync(
        `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income' AND strftime('%m',date)=? AND strftime('%Y',date)=?${currFilter}`,
        [m, y, ...currParam]
      ),
      db.getFirstAsync(
        `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense' AND strftime('%m',date)=? AND strftime('%Y',date)=?${currFilter}`,
        [m, y, ...currParam]
      ),
    ]);

    const totalIncome = income?.total || 0;
    const totalExpense = expense?.total || 0;
    return { income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense };
  }, []);

  const getCategoryBreakdown = useCallback(async (month, year, type = 'expense', currency) => {
    const db = getDb();
    const m = String(month).padStart(2, '0');
    const y = String(year);
    const currFilter = currency ? ' AND currency=?' : '';
    const currParam = currency ? [currency] : [];
    return await db.getAllAsync(
      `SELECT category, SUM(amount) as total FROM transactions WHERE type=? AND strftime('%m',date)=? AND strftime('%Y',date)=?${currFilter} GROUP BY category ORDER BY total DESC`,
      [type, m, y, ...currParam]
    );
  }, []);

  const getMonthlyTotals = useCallback(async (months = 6, currency) => {
    const db = getDb();
    const currFilter = currency ? ' AND currency=?' : '';
    const currParam = currency ? [currency] : [];
    const results = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const y = String(d.getFullYear());
      const [inc, exp] = await Promise.all([
        db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='income' AND strftime('%m',date)=? AND strftime('%Y',date)=?${currFilter}`, [m, y, ...currParam]),
        db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='expense' AND strftime('%m',date)=? AND strftime('%Y',date)=?${currFilter}`, [m, y, ...currParam]),
      ]);
      results.push({ month: d.getMonth() + 1, year: d.getFullYear(), income: inc?.t || 0, expense: exp?.t || 0 });
    }
    return results;
  }, []);

  const getAverageIncome = useCallback(async (lastNMonths = 3, currency) => {
    const db = getDb();
    const currFilter = currency ? ' AND currency=?' : '';
    const currParam = currency ? [currency] : [];
    const now = new Date();
    let total = 0;
    for (let i = 0; i < lastNMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const y = String(d.getFullYear());
      const row = await db.getFirstAsync(
        `SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='income' AND strftime('%m',date)=? AND strftime('%Y',date)=?${currFilter}`,
        [m, y, ...currParam]
      );
      total += row?.t || 0;
    }
    return total / lastNMonths;
  }, []);

  const getMonthSummaryUSD = useCallback(async (month, year) => {
    const db = getDb();
    const m = String(month).padStart(2, '0');
    const y = String(year);
    const [income, expense] = await Promise.all([
      db.getFirstAsync(
        `SELECT COALESCE(SUM(usd_equivalent),0) as t FROM transactions WHERE type='income' AND usd_equivalent IS NOT NULL AND strftime('%m',date)=? AND strftime('%Y',date)=?`,
        [m, y]
      ),
      db.getFirstAsync(
        `SELECT COALESCE(SUM(usd_equivalent),0) as t FROM transactions WHERE type='expense' AND usd_equivalent IS NOT NULL AND strftime('%m',date)=? AND strftime('%Y',date)=?`,
        [m, y]
      ),
    ]);
    const inc = income?.t || 0;
    const exp = expense?.t || 0;
    return { income: inc, expense: exp, balance: inc - exp };
  }, []);

  return {
    transactions, loading, error,
    fetchTransactions, addTransaction, updateTransaction, deleteTransaction,
    getMonthSummary, getCategoryBreakdown, getMonthlyTotals, getAverageIncome,
    getMonthSummaryUSD,
  };
}
