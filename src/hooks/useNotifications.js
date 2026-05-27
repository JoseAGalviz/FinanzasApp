import { useCallback } from 'react';
import { Platform } from 'react-native';
import { getDb } from '../database/db';
import { EXPENSE_CATEGORIES } from '../constants/categories';

let notifModule = null;
let handlerSet = false;
let channelCreated = false;

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
  if (Platform.OS === 'android' && !channelCreated) {
    await notifModule.setNotificationChannelAsync('default', {
      name: 'FinanzasApp',
      importance: notifModule.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
      enableVibrate: true,
      showBadge: false,
    });
    channelCreated = true;
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
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status: requested } = await Notifications.requestPermissionsAsync();
    return requested === 'granted';
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
  } catch { /* local notifications may not be available */ }
}

function getLastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function useNotifications() {

  const checkBudgetAlerts = useCallback(async (month, year) => {
    if (!(await hasPermission())) return;
    const cfg = await getConfig();
    if (!cfg.budget_alert?.enabled) return;

    const db = getDb();
    const m = String(month).padStart(2, '0');
    const y = String(year);

    const budgets = await db.getAllAsync('SELECT * FROM budgets WHERE month=? AND year=?', [month, year]);
    if (!budgets.length) return;

    const spending = await db.getAllAsync(
      `SELECT category, SUM(amount) as spent FROM transactions
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
          trigger: { date: trigger, channelId: 'default' },
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
      trigger: { date: trigger, channelId: 'default' },
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

  // Schedule notifications for bills: fires X days before due_day each month
  const scheduleBillNotifications = useCallback(async () => {
    if (!(await hasPermission())) return;

    await cancelByPrefix('bill_');

    const db = getDb();
    const bills = await db.getAllAsync('SELECT * FROM bills WHERE is_active=1');
    if (!bills.length) return;

    const Notifications = await getNotif();
    const now = new Date();

    for (const bill of bills) {
      const notifyBefore = bill.notify_days_before ?? 3;
      const [notifyHour, notifyMin] = (bill.notify_time || '09:00').split(':').map(Number);

      // Schedule for current month and next month
      for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        const lastDay = getLastDayOfMonth(year, month);
        const dueDayActual = bill.due_day === 0 ? lastDay : Math.min(bill.due_day, lastDay);

        const notifyDay = dueDayActual - notifyBefore;
        if (notifyDay < 1) continue;

        const triggerDate = new Date(year, month - 1, notifyDay, notifyHour, notifyMin, 0);
        if (triggerDate <= now) continue;

        const dueDayLabel = bill.due_day === 0 ? 'el último día del mes' : `el día ${dueDayActual}`;
        await Notifications.scheduleNotificationAsync({
          identifier: `bill_${bill.id}_${year}_${month}`,
          content: {
            title: '📋 Pago próximo',
            body: `"${bill.name}" vence ${dueDayLabel}. ${notifyBefore} día(s) para el vencimiento.`,
            sound: true,
          },
          trigger: { date: triggerDate, channelId: 'default' },
        }).catch(() => {});
      }
    }
  }, []);

  // Schedule recurring income reminders (day 15 and last day of month)
  const scheduleRecurringIncomeReminders = useCallback(async () => {
    if (!(await hasPermission())) return;
    const cfg = await getConfig();
    if (!cfg.recurring_income?.enabled) return;

    await cancelByPrefix('recurring_income_');

    const db = getDb();
    const recurring = await db.getAllAsync(
      "SELECT DISTINCT category, type, description, recurring_day FROM transactions WHERE is_recurring=1 AND recurring_day IS NOT NULL"
    );
    if (!recurring.length) return;

    const configRow = await db.getFirstAsync("SELECT time FROM notifications_config WHERE type='recurring_income'");
    const globalTime = configRow?.time || '09:00';

    const Notifications = await getNotif();
    const now = new Date();

    for (const tmpl of recurring) {
      const [notifyHour, notifyMin] = globalTime.split(':').map(Number);
      for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        const lastDay = getLastDayOfMonth(year, month);
        const day = tmpl.recurring_day === 0 ? lastDay : Math.min(tmpl.recurring_day, lastDay);

        const triggerDate = new Date(year, month - 1, day, notifyHour, notifyMin, 0);
        if (triggerDate <= now) continue;

        const label = tmpl.type === 'income' ? 'ingreso' : 'gasto';
        const name = tmpl.description || tmpl.category;
        await Notifications.scheduleNotificationAsync({
          identifier: `recurring_income_${tmpl.category}_${year}_${month}`,
          content: {
            title: `💰 ${tmpl.type === 'income' ? 'Día de cobro' : 'Pago recurrente'}`,
            body: `Recuerda registrar tu ${label}: ${name}.`,
            sound: true,
          },
          trigger: { date: triggerDate, channelId: 'default' },
        }).catch(() => {});
      }
    }
  }, []);

  const sendTestNotification = useCallback(async (type, content) => {
    if (!(await hasPermission())) {
      return false;
    }
    const Notifications = await getNotif();
    await Notifications.scheduleNotificationAsync({
      content: { ...content, sound: true },
      trigger: null,
    });
    return true;
  }, []);

  const scheduleAllNotifications = useCallback(async (month, year) => {
    if (!(await hasPermission())) return;
    await Promise.all([
      checkBudgetAlerts(month, year),
      scheduleDebtReminders(),
      scheduleGoalReminder(),
      checkEmergencyFundAlert(),
      scheduleBillNotifications(),
      scheduleRecurringIncomeReminders(),
    ]);
  }, [checkBudgetAlerts, scheduleDebtReminders, scheduleGoalReminder, checkEmergencyFundAlert, scheduleBillNotifications, scheduleRecurringIncomeReminders]);

  return {
    checkBudgetAlerts,
    scheduleDebtReminders,
    scheduleGoalReminder,
    checkEmergencyFundAlert,
    scheduleBillNotifications,
    scheduleRecurringIncomeReminders,
    scheduleAllNotifications,
    sendTestNotification,
  };
}
