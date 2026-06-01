import { useState, useCallback } from 'react';
import { getDb } from '../database/db';

export function useInvestments() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const rows = await db.getAllAsync('SELECT * FROM investments ORDER BY current_value DESC');
      setInvestments(rows);
      return rows;
    } finally {
      setLoading(false);
    }
  }, []);

  const addInvestment = useCallback(async (data) => {
    const db = getDb();
    const result = await db.runAsync(
      'INSERT INTO investments (name, type, invested_amount, current_value, purchase_date, notes, currency) VALUES (?,?,?,?,?,?,?)',
      [data.name, data.type, parseFloat(data.invested_amount), parseFloat(data.current_value), data.purchase_date || null, data.notes || null, data.currency || 'USD']
    );
    return result.lastInsertRowId;
  }, []);

  const updateInvestment = useCallback(async (id, data) => {
    const db = getDb();
    await db.runAsync(
      'UPDATE investments SET name=?, type=?, invested_amount=?, current_value=?, purchase_date=?, notes=?, currency=? WHERE id=?',
      [data.name, data.type, parseFloat(data.invested_amount), parseFloat(data.current_value), data.purchase_date || null, data.notes || null, data.currency || 'USD', id]
    );
  }, []);

  const deleteInvestment = useCallback(async (id) => {
    const db = getDb();
    await db.runAsync('DELETE FROM investments WHERE id=?', [id]);
  }, []);

  const getPortfolioSummary = useCallback(async () => {
    const db = getDb();
    const rows = await db.getAllAsync('SELECT * FROM investments');
    const totalInvested = rows.reduce((s, r) => s + parseFloat(r.invested_amount || 0), 0);
    const totalValue = rows.reduce((s, r) => s + parseFloat(r.current_value || 0), 0);
    const gain = totalValue - totalInvested;
    const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

    const byType = {};
    for (const r of rows) {
      byType[r.type] = (byType[r.type] || 0) + parseFloat(r.current_value || 0);
    }

    return {
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100,
      gain: Math.round(gain * 100) / 100,
      gainPct: Math.round(gainPct * 10) / 10,
      byType,
      count: rows.length,
    };
  }, []);

  const getPieData = useCallback(async () => {
    const db = getDb();
    const rows = await db.getAllAsync(
      'SELECT type, SUM(current_value) as total FROM investments GROUP BY type ORDER BY total DESC'
    );
    const typeColors = {
      etf: '#10B981', stock: '#3B82F6', crypto: '#F59E0B',
      savings_account: '#8B5CF6', real_estate: '#EC4899', bonds: '#14B8A6', other: '#6B7280',
    };
    const typeNames = {
      etf: 'ETF', stock: 'Acciones', crypto: 'Crypto',
      savings_account: 'Ahorro', real_estate: 'Inmueble', bonds: 'Bonos', other: 'Otro',
    };
    return rows.map(r => ({
      value: parseFloat(r.total),
      color: typeColors[r.type] || '#6B7280',
      text: typeNames[r.type] || r.type,
      label: typeNames[r.type] || r.type,
    }));
  }, []);

  return {
    investments, loading,
    fetchInvestments, addInvestment, updateInvestment, deleteInvestment,
    getPortfolioSummary, getPieData,
  };
}
