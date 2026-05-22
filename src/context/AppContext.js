import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getDb } from '../database/db';
import { getCurrentMonthYear } from '../utils/formatDate';
import { LightColors, DarkColors } from '../constants/colors';
import { CURRENCY_SYMBOLS } from '../constants/theme';

const AppContext = createContext(null);

const { month, year } = getCurrentMonthYear();

const initialState = {
  theme: 'system',
  currencySymbol: '$',
  selectedMonth: month,
  selectedYear: year,
  isDbReady: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_READY':
      return { ...state, isDbReady: true };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_CURRENCY':
      return { ...state, currencySymbol: action.payload };
    case 'SET_MONTH':
      return { ...state, selectedMonth: action.payload.month, selectedYear: action.payload.year };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const systemScheme = useColorScheme();
  const [exchangeRates, setExchangeRates] = useState({ VES: { rate: 90 }, COP: { rate: 4200 } });
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      const db = getDb();
      if (!db) return;
      const rows = await db.getAllAsync('SELECT key, value FROM settings');
      for (const row of rows) {
        if (row.key === 'theme') dispatch({ type: 'SET_THEME', payload: row.value });
        if (row.key === 'currency_symbol') dispatch({ type: 'SET_CURRENCY', payload: row.value });
      }
      const rateRows = await db.getAllAsync('SELECT * FROM exchange_rates');
      if (rateRows.length > 0) {
        const rateMap = {};
        let latest = null;
        for (const r of rateRows) {
          rateMap[r.from_currency] = { rate: r.rate, updated_at: r.updated_at };
          if (!latest || r.updated_at > latest) latest = r.updated_at;
        }
        setExchangeRates(rateMap);
        setRatesUpdatedAt(latest);
      }
      dispatch({ type: 'SET_READY' });
    }
    loadSettings();
  }, []);

  const isDark =
    state.theme === 'dark' ||
    (state.theme === 'system' && systemScheme === 'dark');

  const colors = isDark ? DarkColors : LightColors;
  const currencyCode = CURRENCY_SYMBOLS.find(c => c.symbol === state.currencySymbol)?.code ?? 'USD';

  async function setSetting(key, value) {
    const db = getDb();
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [key, value]);
  }

  async function updateTheme(newTheme) {
    await setSetting('theme', newTheme);
    dispatch({ type: 'SET_THEME', payload: newTheme });
  }

  async function updateCurrency(symbol) {
    await setSetting('currency_symbol', symbol);
    dispatch({ type: 'SET_CURRENCY', payload: symbol });
  }

  function setSelectedMonth(m, y) {
    dispatch({ type: 'SET_MONTH', payload: { month: m, year: y } });
  }

  function convertToUSD(amount, currency) {
    if (!currency || currency === 'USD') return parseFloat(amount) || 0;
    const entry = exchangeRates[currency];
    if (!entry || !entry.rate) return null;
    return (parseFloat(amount) || 0) / entry.rate;
  }

  async function updateExchangeRate(fromCurrency, rate) {
    const db = getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO exchange_rates (from_currency, to_currency, rate, updated_at) VALUES (?,?,?,datetime("now"))',
      [fromCurrency, 'USD', parseFloat(rate)]
    );
    const rateRows = await db.getAllAsync('SELECT * FROM exchange_rates');
    const rateMap = {};
    let latest = null;
    for (const r of rateRows) {
      rateMap[r.from_currency] = { rate: r.rate, updated_at: r.updated_at };
      if (!latest || r.updated_at > latest) latest = r.updated_at;
    }
    setExchangeRates(rateMap);
    setRatesUpdatedAt(latest);
  }

  const value = {
    ...state,
    isDark,
    colors,
    currencyCode,
    exchangeRates,
    ratesUpdatedAt,
    convertToUSD,
    updateExchangeRate,
    updateTheme,
    updateCurrency,
    setSelectedMonth,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
