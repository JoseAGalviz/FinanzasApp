import { useCallback, useRef } from 'react';
import { getDb } from '../database/db';
import { EXPENSE_CATEGORIES } from '../constants/categories';

let notifModule = null;
let handlerSet = false;

async function getNotif() {
  if (!notifModule) {
    notifModule = await import('expo-notifications');
    if (!handlerSet) {
      notifModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerSet = true;
    }
  }
  return notifModule;
}

async function getConfig() {
  const db = getDb();
  if (!db) return {};
  const rows = await db.getAllAsync('SELECT * FROM notifications_config');
  const map = {};
  for (const r of rows) map[r.type] = r;
  return map;
}

async function hasPermission() {
  try {
    const Notifications = await getNotif();
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

async function cancelByPrefix(prefix) {
  try {
    const Notifications = await getNotif();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(n => n.identifier.startsWith(prefix))
        .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // local notifications may not be available
  }
}

export function useNotifications() {

  const checkBudgetAlerts = useCallback(async (month, year) => {
    if (!(await hasPermission())) return;
    const cfg = await getConfig();
    if (!cfg.budget_alert?.enabled) return;

    const db = getDb();
    const m = String(month).padStart(2, '0');
    const y = String(year);

    const budgets = await db.getAllAsync(
      'SELECT * FROM budgets WHERE month=? AND year=?',
      [month, year]
    );
    if (!budgets.length) return;

    const spending = await db.getAllAsync(
      `SELECT category, SUM(amount) as spent
       FROM transactions
       WHERE type='expense' AND strftime('%m',date)=? AND strftime('%Y',date)=?
       GROUP BY category`,
      [m, y]
    );
    const spentMap = {};
    for (const r of spending) spentMap[r.category] = r.spent;

    await cancelByPrefix('budget_alert_');

    const Notifications = await getNotif();
    for (const budget of budgets) {
      const spent = spentMap[budget.category_id] || 0;
      const progress = budget.limit_amount > 0 ? spent / budget.limit_amount : 0;
      if (progress >= 0.8) {
        const cat = EXPENSE_CATEGORIES.find(c => c.id === budget.category_id);
        const pct = Math.round(progress * 100);
        await Notifications.scheduleNotificationAsync({
          identifier: `budget_alert_${budget.category_id}`,
          content: {
            title: 'Alerta de Presupuesto',
            body: `${cat?.name || budget.category_id}: ${pct}% del límite mensual usado.`,
            sound: true,
          },
          trigger: null,
        }).catch(() => {});
      }
    }
  }, []);

  const scheduleDebtReminders = useCallback(async () => {
    if (!(await hasPermission())) return;
    const cfg = await getConfig();
    if (!cfg.debt_reminder?.enabled) return;

    const daysBefore = cfg.debt_reminder?.days_before ?? 3;
    const [hour, min] = (cfg.debt_reminder?.time || '08:00').split(':').map(Number);

    await cancelByPrefix('debt_reminder_');

    const db = getDb();
    const debts = await db.getAllAsync(
      'SELECT * FROM debts WHERE due_date IS NOT NULL AND remaining_amount > 0'
    );

    const Notifications = await getNotif();
    for (const debt of debts) {
      const due = new Date(debt.due_date + 'T12:00:00');
      const trigger = new Date(due);
      trigger.setDate(trigger.getDate() - daysBefore);
      trigger.setHours(hour, min, 0, 0);

      if (trigger > new Date()) {
        await Notifications.scheduleNotificationAsync({
          identifier: `debt_reminder_${debt.id}`,
          content: {
            title: 'Pago próximo a vencer',
            body: `"${debt.name}" vence el ${debt.due_date}. Recuerda hacer tu pago.`,
            sound: true,
          },
          trigger: { date: trigger },
        }).catch(() => {});
      }
    }
  }, []);

  const scheduleGoalReminder = useCallback(async () => {
    if (!(await hasPermission())) return;
    const cfg = await getConfig();
    if (!cfg.goal_reminder?.enabled) return;

    const [hour, min] = (cfg.goal_reminder?.time || '10:00').split(':').map(Number);

    const Notifications = await getNotif();
    await Notifications.cancelScheduledNotificationAsync('goal_reminder').catch(() => {});

    const db = getDb();
    const goals = await db.getAllAsync(
      'SELECT * FROM savings_goals WHERE current_amount < target_amount'
    );
    if (!goals.length) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffISO = cutoff.toISOString().split('T')[0];

    const recent = await db.getAllAsync(
      'SELECT DISTINCT goal_id FROM savings_contributions WHERE date >= ?',
      [cutoffISO]
    );
    const recentIds = new Set(recent.map(r => r.goal_id));
    const neglected = goals.filter(g => !recentIds.has(g.id));
    if (!neglected.length) return;

    const trigger = new Date();
    trigger.setDate(trigger.getDate() + 7);
    trigger.setHours(hour, min, 0, 0);

    const names = neglected.slice(0, 2).map(g => g.name).join(', ');
    const extra = neglected.length > 2 ? ` y ${neglected.length - 2} más` : '';

    await Notifications.scheduleNotificationAsync({
      identifier: 'goal_reminder',
      content: {
        title: 'Recordatorio de Metas',
        body: `Sin aportes esta semana: ${names}${extra}. ¡Mantén el ritmo!`,
        sound: true,
      },
      trigger: { date: trigger },
    }).catch(() => {});
  }, []);

  const checkEmergencyFundAlert = useCallback(async () => {
    if (!(await hasPermission())) return;
    const cfg = await getConfig();
    if (!cfg.emergency_fund_alert?.enabled) return;

    const Notifications = await getNotif();
    await Notifications.cancelScheduledNotificationAsync('emergency_fund_alert').catch(() => {});

    const db = getDb();
    const fund = await db.getFirstAsync('SELECT * FROM emergency_fund LIMIT 1');
    if (!fund) return;

    const target = fund.target_months * fund.monthly_expenses;
    if (target <= 0) return;

    const progress = fund.current_amount / target;
    if (progress < 1) {
      await Notifications.scheduleNotificationAsync({
        identifier: 'emergency_fund_alert',
        content: {
          title: 'Fondo de Emergencia',
          body: `Tu fondo está al ${Math.round(progress * 100)}% del objetivo. Sigue aportando.`,
          sound: true,
        },
        trigger: null,
      }).catch(() => {});
    }
  }, []);

  const scheduleAllNotifications = useCallback(async (month, year) => {
    if (!(await hasPermission())) return;
    await Promise.all([
      checkBudgetAlerts(month, year),
      scheduleDebtReminders(),
      scheduleGoalReminder(),
      checkEmergencyFundAlert(),
    ]);
  }, [checkBudgetAlerts, scheduleDebtReminders, scheduleGoalReminder, checkEmergencyFundAlert]);

  return {
    checkBudgetAlerts,
    scheduleDebtReminders,
    scheduleGoalReminder,
    checkEmergencyFundAlert,
    scheduleAllNotifications,
  };
}
