import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDb } from '../database/db';
import { formatDate } from './formatDate';

function arrayToCSV(headers, rows) {
  const escape = (val) => {
    const s = String(val === null || val === undefined ? '' : val);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}

export async function exportTransactionsCSV(startDate, endDate) {
  const db = getDb();
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (startDate) { sql += ' AND date >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND date <= ?'; params.push(endDate); }
  sql += ' ORDER BY date DESC';

  const rows = await db.getAllAsync(sql, params);

  const headers = ['Fecha', 'Tipo', 'Monto', 'Categoría', 'Descripción', 'Recurrente'];
  const data = rows.map(r => [
    formatDate(r.date),
    r.type === 'income' ? 'Ingreso' : 'Gasto',
    r.amount,
    r.category,
    r.description || '',
    r.is_recurring ? 'Sí' : 'No',
  ]);

  const csv = arrayToCSV(headers, data);
  const filename = `transacciones_${Date.now()}.csv`;
  const uri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  return uri;
}

export async function exportFullBackupJSON() {
  const db = getDb();

  const [transactions, categories, budgets, savings_goals, savings_contributions,
    debts, debt_payments, emergency_fund, investments, settings, bills, bill_payments] = await Promise.all([
    db.getAllAsync('SELECT * FROM transactions'),
    db.getAllAsync('SELECT * FROM categories'),
    db.getAllAsync('SELECT * FROM budgets'),
    db.getAllAsync('SELECT * FROM savings_goals'),
    db.getAllAsync('SELECT * FROM savings_contributions'),
    db.getAllAsync('SELECT * FROM debts'),
    db.getAllAsync('SELECT * FROM debt_payments'),
    db.getAllAsync('SELECT * FROM emergency_fund'),
    db.getAllAsync('SELECT * FROM investments'),
    db.getAllAsync('SELECT * FROM settings'),
    db.getAllAsync('SELECT * FROM bills'),
    db.getAllAsync('SELECT * FROM bill_payments'),
  ]);

  const backup = {
    version: '1.1',
    exportedAt: new Date().toISOString(),
    data: {
      transactions, categories, budgets, savings_goals, savings_contributions,
      debts, debt_payments, emergency_fund, investments, settings, bills, bill_payments,
    },
  };

  const json = JSON.stringify(backup, null, 2);
  const filename = `backup_finanzas_${Date.now()}.json`;
  const uri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
  return uri;
}

export async function importBackupJSON(uri) {
  const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const backup = JSON.parse(content);

  if (!backup.data) throw new Error('Archivo de respaldo inválido');

  const db = getDb();
  const { data } = backup;

  await db.withTransactionAsync(async () => {
    const tables = [
      'debt_payments', 'savings_contributions', 'debts', 'savings_goals',
      'budgets', 'transactions', 'categories', 'emergency_fund', 'investments', 'settings',
    ];
    for (const t of tables) {
      await db.runAsync(`DELETE FROM ${t}`);
    }

    for (const row of (data.transactions || [])) {
      await db.runAsync(
        'INSERT OR REPLACE INTO transactions (id, type, amount, category, description, date, is_recurring, recurring_day, receipt_uri, currency, rate_type, usd_equivalent, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [row.id, row.type, row.amount, row.category, row.description, row.date, row.is_recurring,
         row.recurring_day ?? null, row.receipt_uri, row.currency || 'USD', row.rate_type || 'parallel',
         row.usd_equivalent ?? null, row.created_at]
      );
    }

    for (const row of (data.bills || [])) {
      await db.runAsync(
        'INSERT OR REPLACE INTO bills (id, name, amount, currency, due_day, category, notes, is_active, notify_days_before, notify_time, color, icon, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [row.id, row.name, row.amount, row.currency || 'USD', row.due_day, row.category || 'other',
         row.notes, row.is_active ?? 1, row.notify_days_before ?? 3, row.notify_time || '09:00',
         row.color || '#EF4444', row.icon || 'receipt', row.created_at]
      );
    }

    for (const row of (data.bill_payments || [])) {
      await db.runAsync(
        'INSERT OR REPLACE INTO bill_payments (id, bill_id, amount, currency, date, notes, created_at) VALUES (?,?,?,?,?,?,?)',
        [row.id, row.bill_id, row.amount, row.currency || 'USD', row.date, row.notes, row.created_at]
      );
    }

    for (const row of (data.savings_goals || [])) {
      await db.runAsync(
        'INSERT OR REPLACE INTO savings_goals (id, name, target_amount, current_amount, deadline, icon, color, created_at) VALUES (?,?,?,?,?,?,?,?)',
        [row.id, row.name, row.target_amount, row.current_amount, row.deadline, row.icon, row.color, row.created_at]
      );
    }

    for (const row of (data.debts || [])) {
      await db.runAsync(
        'INSERT OR REPLACE INTO debts (id, name, total_amount, remaining_amount, interest_rate, minimum_payment, due_date, strategy, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [row.id, row.name, row.total_amount, row.remaining_amount, row.interest_rate, row.minimum_payment, row.due_date, row.strategy, row.created_at]
      );
    }

    for (const row of (data.investments || [])) {
      await db.runAsync(
        'INSERT OR REPLACE INTO investments (id, name, type, invested_amount, current_value, purchase_date, created_at) VALUES (?,?,?,?,?,?,?)',
        [row.id, row.name, row.type, row.invested_amount, row.current_value, row.purchase_date, row.created_at]
      );
    }

    for (const row of (data.settings || [])) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [row.key, row.value]);
    }
  });
}

export async function shareFile(uri) {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Compartir no está disponible en este dispositivo');
  await Sharing.shareAsync(uri);
}
