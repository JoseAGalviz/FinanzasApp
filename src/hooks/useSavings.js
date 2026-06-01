import { useState, useCallback } from 'react';
import { getDb } from '../database/db';
import { calculateMonthlySavingsNeeded } from '../utils/calculations';

export function useSavings() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const rows = await db.getAllAsync('SELECT * FROM savings_goals ORDER BY created_at DESC');
      setGoals(rows);
      return rows;
    } finally {
      setLoading(false);
    }
  }, []);

  const addGoal = useCallback(async (data) => {
    const db = getDb();
    const result = await db.runAsync(
      'INSERT INTO savings_goals (name, target_amount, current_amount, deadline, icon, color, currency) VALUES (?,?,?,?,?,?,?)',
      [data.name, parseFloat(data.target_amount), parseFloat(data.current_amount) || 0, data.deadline || null, data.icon || 'star', data.color || '#10B981', data.currency || 'USD']
    );
    return result.lastInsertRowId;
  }, []);

  const updateGoal = useCallback(async (id, data) => {
    const db = getDb();
    await db.runAsync(
      'UPDATE savings_goals SET name=?, target_amount=?, deadline=?, icon=?, color=?, currency=? WHERE id=?',
      [data.name, parseFloat(data.target_amount), data.deadline || null, data.icon || 'star', data.color || '#10B981', data.currency || 'USD', id]
    );
  }, []);

  const deleteGoal = useCallback(async (id) => {
    const db = getDb();
    await db.runAsync('DELETE FROM savings_goals WHERE id=?', [id]);
  }, []);

  const addContribution = useCallback(async (goalId, amount, note, date) => {
    const db = getDb();
    const parsed = parseFloat(amount);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'INSERT INTO savings_contributions (goal_id, amount, note, date) VALUES (?,?,?,?)',
        [goalId, parsed, note || null, date]
      );
      await db.runAsync(
        'UPDATE savings_goals SET current_amount = MIN(target_amount, current_amount + ?) WHERE id=?',
        [parsed, goalId]
      );
    });
  }, []);

  const deleteContribution = useCallback(async (contributionId, goalId, amount) => {
    const db = getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM savings_contributions WHERE id=?', [contributionId]);
      await db.runAsync(
        'UPDATE savings_goals SET current_amount = MAX(0, current_amount - ?) WHERE id=?',
        [parseFloat(amount), goalId]
      );
    });
  }, []);

  const getContributions = useCallback(async (goalId) => {
    const db = getDb();
    return await db.getAllAsync(
      'SELECT * FROM savings_contributions WHERE goal_id=? ORDER BY date DESC',
      [goalId]
    );
  }, []);

  const getGoalWithProgress = useCallback(async (id) => {
    const db = getDb();
    const goal = await db.getFirstAsync('SELECT * FROM savings_goals WHERE id=?', [id]);
    if (!goal) return null;
    const progress = goal.target_amount > 0 ? goal.current_amount / goal.target_amount : 0;
    const monthly = calculateMonthlySavingsNeeded(goal.target_amount, goal.current_amount, goal.deadline);
    return { ...goal, progress, monthlyNeeded: monthly };
  }, []);

  const getTotalSaved = useCallback(async () => {
    const db = getDb();
    const row = await db.getFirstAsync('SELECT COALESCE(SUM(current_amount),0) as total FROM savings_goals');
    return row?.total || 0;
  }, []);

  return {
    goals, loading,
    fetchGoals, addGoal, updateGoal, deleteGoal,
    addContribution, deleteContribution, getContributions,
    getGoalWithProgress, getTotalSaved,
  };
}
