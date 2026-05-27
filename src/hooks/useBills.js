import { useState, useCallback } from 'react';
import { getDb } from '../database/db';

export function useBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const rows = await db.getAllAsync('SELECT * FROM bills ORDER BY due_day ASC');
      setBills(rows);
      return rows;
    } finally {
      setLoading(false);
    }
  }, []);

  const addBill = useCallback(async (data) => {
    const db = getDb();
    const result = await db.runAsync(
      'INSERT INTO bills (name, amount, currency, due_day, category, notes, is_active, notify_days_before, notify_time, color, icon) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [data.name, parseFloat(data.amount), data.currency || 'USD', data.due_day, data.category || 'other',
       data.notes || null, data.is_active !== false ? 1 : 0, data.notify_days_before ?? 3,
       data.notify_time || '09:00', data.color || '#EF4444', data.icon || 'receipt']
    );
    return result.lastInsertRowId;
  }, []);

  const updateBill = useCallback(async (id, data) => {
    const db = getDb();
    await db.runAsync(
      'UPDATE bills SET name=?, amount=?, currency=?, due_day=?, category=?, notes=?, is_active=?, notify_days_before=?, notify_time=?, color=?, icon=? WHERE id=?',
      [data.name, parseFloat(data.amount), data.currency || 'USD', data.due_day, data.category || 'other',
       data.notes || null, data.is_active !== false ? 1 : 0, data.notify_days_before ?? 3,
       data.notify_time || '09:00', data.color || '#EF4444', data.icon || 'receipt', id]
    );
  }, []);

  const deleteBill = useCallback(async (id) => {
    const db = getDb();
    await db.runAsync('DELETE FROM bills WHERE id=?', [id]);
  }, []);

  const toggleBillActive = useCallback(async (id, isActive) => {
    const db = getDb();
    await db.runAsync('UPDATE bills SET is_active=? WHERE id=?', [isActive ? 1 : 0, id]);
  }, []);

  const markAsPaid = useCallback(async (billId, amount, currency, date, notes) => {
    const db = getDb();
    await db.runAsync(
      'INSERT INTO bill_payments (bill_id, amount, currency, date, notes) VALUES (?,?,?,?,?)',
      [billId, parseFloat(amount), currency || 'USD', date, notes || null]
    );
  }, []);

  const getPaymentHistory = useCallback(async (billId) => {
    const db = getDb();
    return await db.getAllAsync(
      'SELECT * FROM bill_payments WHERE bill_id=? ORDER BY date DESC',
      [billId]
    );
  }, []);

  // Returns bills with isPaidThisMonth and daysUntilDue calculated
  const getBillsWithStatus = useCallback(async () => {
    const db = getDb();
    const now = new Date();
    const todayDay = now.getDate();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());

    const activeBills = await db.getAllAsync('SELECT * FROM bills WHERE is_active=1 ORDER BY due_day ASC');

    const result = [];
    for (const bill of activeBills) {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dueDayActual = bill.due_day === 0 ? lastDay : Math.min(bill.due_day, lastDay);

      // Check if paid this month
      const payment = await db.getFirstAsync(
        "SELECT id FROM bill_payments WHERE bill_id=? AND strftime('%m',date)=? AND strftime('%Y',date)=?",
        [bill.id, month, year]
      );

      const daysUntilDue = dueDayActual - todayDay;

      result.push({
        ...bill,
        dueDayActual,
        isPaidThisMonth: !!payment,
        daysUntilDue,
        isOverdue: !payment && daysUntilDue < 0,
        isDueSoon: !payment && daysUntilDue >= 0 && daysUntilDue <= 3,
      });
    }
    return result;
  }, []);

  const getUpcomingBills = useCallback(async (daysAhead = 7) => {
    const db = getDb();
    const now = new Date();
    const todayDay = now.getDate();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());

    const activeBills = await db.getAllAsync('SELECT * FROM bills WHERE is_active=1');
    const upcoming = [];

    for (const bill of activeBills) {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dueDayActual = bill.due_day === 0 ? lastDay : Math.min(bill.due_day, lastDay);
      const daysUntilDue = dueDayActual - todayDay;

      if (daysUntilDue >= 0 && daysUntilDue <= daysAhead) {
        const payment = await db.getFirstAsync(
          "SELECT id FROM bill_payments WHERE bill_id=? AND strftime('%m',date)=? AND strftime('%Y',date)=?",
          [bill.id, month, year]
        );
        if (!payment) upcoming.push({ ...bill, daysUntilDue, dueDayActual });
      }
    }
    return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, []);

  return {
    bills, loading,
    fetchBills, addBill, updateBill, deleteBill, toggleBillActive,
    markAsPaid, getPaymentHistory, getBillsWithStatus, getUpcomingBills,
  };
}
