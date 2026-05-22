import * as SQLite from 'expo-sqlite';

let db = null;

export async function initDatabase() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('finance.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await createTables();
  await runMigrations();
  await seedDefaults();
  return db;
}

export function getDb() {
  return db;
}

export async function clearAllData() {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM transactions;
      DELETE FROM savings_goals;
      DELETE FROM savings_contributions;
      DELETE FROM debts;
      DELETE FROM debt_payments;
      DELETE FROM emergency_fund;
      DELETE FROM investments;
      DELETE FROM budgets;
    `);
  });
}

async function createTables() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      is_recurring INTEGER DEFAULT 0,
      receipt_uri TEXT,
      currency TEXT DEFAULT 'USD',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      icon TEXT,
      color TEXT,
      budget_limit REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      limit_amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(category_id, month, year)
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      deadline TEXT,
      icon TEXT DEFAULT 'star',
      color TEXT DEFAULT '#10B981',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS savings_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      remaining_amount REAL NOT NULL,
      interest_rate REAL DEFAULT 0,
      minimum_payment REAL DEFAULT 0,
      due_date TEXT,
      strategy TEXT DEFAULT 'avalanche',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS debt_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      debt_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(debt_id) REFERENCES debts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS emergency_fund (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_months REAL DEFAULT 6,
      monthly_expenses REAL DEFAULT 0,
      current_amount REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      invested_amount REAL NOT NULL,
      current_value REAL NOT NULL,
      purchase_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL UNIQUE,
      enabled INTEGER DEFAULT 1,
      time TEXT DEFAULT '09:00',
      days_before INTEGER DEFAULT 3
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL DEFAULT 'USD',
      rate REAL NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(from_currency, to_currency)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS db_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

async function runMigrations() {
  const current = await db.getFirstAsync('SELECT MAX(version) as v FROM db_migrations');
  const version = current?.v || 0;

  if (version < 1) {
    await db.runAsync("INSERT OR IGNORE INTO db_migrations (version) VALUES (1)");
  }
  if (version < 2) {
    await db.execAsync("ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT 'USD'");
    await db.runAsync("INSERT OR IGNORE INTO db_migrations (version) VALUES (2)");
  }
  if (version < 3) {
    try {
      await db.execAsync("ALTER TABLE transactions ADD COLUMN usd_equivalent REAL DEFAULT NULL");
    } catch (_) {}
    await db.execAsync("UPDATE transactions SET usd_equivalent = amount WHERE currency = 'USD' OR currency IS NULL");
    await db.runAsync("INSERT OR IGNORE INTO db_migrations (version) VALUES (3)");
  }
}

async function seedDefaults() {
  const notifs = [
    ['budget_alert', 1, '09:00', 0],
    ['goal_reminder', 1, '10:00', 0],
    ['debt_reminder', 1, '08:00', 3],
    ['emergency_fund_alert', 1, '09:00', 0],
  ];
  for (const [type, enabled, time, days] of notifs) {
    await db.runAsync(
      'INSERT OR IGNORE INTO notifications_config (type, enabled, time, days_before) VALUES (?,?,?,?)',
      [type, enabled, time, days]
    );
  }

  await db.runAsync("INSERT OR IGNORE INTO settings (key, value) VALUES ('currency_symbol', '$')");
  await db.runAsync("INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'system')");
  await db.runAsync("INSERT OR IGNORE INTO exchange_rates (from_currency, to_currency, rate) VALUES ('VES', 'USD', 90)");
  await db.runAsync("INSERT OR IGNORE INTO exchange_rates (from_currency, to_currency, rate) VALUES ('COP', 'USD', 4200)");
}
