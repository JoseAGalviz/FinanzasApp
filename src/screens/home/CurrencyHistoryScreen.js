import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useTransactions } from '../../hooks/useTransactions';
import { TransactionGroup } from '../../components/TransactionItem';
import { EmptyState } from '../../components/EmptyState';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatMonthYear, prevMonth, nextMonth } from '../../utils/formatDate';
import { FontSize, FontWeight, Spacing, getCurrencySymbol } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function CurrencyHistoryScreen({ navigation, route }) {
  const { currency } = route.params;
  const symbol = getCurrencySymbol(currency);
  const { colors, selectedMonth, selectedYear } = useApp();
  const { transactions, loading, fetchTransactions, getMonthSummary } = useTransactions();

  const [month, setMonth] = useState(selectedMonth);
  const [year, setYear] = useState(selectedYear);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await fetchTransactions({ month, year, currency });
    const s = await getMonthSummary(month, year, currency);
    setSummary(s);
  }, [month, year, currency]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  function goPrev() {
    const p = prevMonth(month, year);
    setMonth(p.month);
    setYear(p.year);
  }

  function goNext() {
    const n = nextMonth(month, year);
    setMonth(n.month);
    setYear(n.year);
  }

  const grouped = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      const key = formatDate(t.date, 'EEEE, d MMMM');
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return Object.entries(map);
  }, [transactions]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Month nav + summary */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{formatMonthYear(month, year)}</Text>
          <TouchableOpacity onPress={goNext} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ingresos</Text>
            <Text style={[styles.summaryVal, { color: colors.primary }]}>{formatCurrency(summary.income, symbol)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Gastos</Text>
            <Text style={[styles.summaryVal, { color: colors.danger }]}>{formatCurrency(summary.expense, symbol)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Balance</Text>
            <Text style={[styles.summaryVal, { color: summary.balance >= 0 ? colors.primary : colors.danger }]}>
              {formatCurrency(summary.balance, symbol)}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={([date]) => date}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item: [date, txs] }) => (
          <TransactionGroup
            date={date}
            transactions={txs}
            onItemPress={t => navigation.navigate('AddTransaction', { transaction: t })}
          />
        )}
        ListEmptyComponent={
          !loading ? <EmptyState icon="receipt-outline" message="Sin transacciones este mes" /> : null
        }
        contentContainerStyle={grouped.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  navBtn: { padding: Spacing.sm },
  monthLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, minWidth: 140, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.md },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: FontSize.xs },
  summaryVal: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginTop: 2 },
  emptyContainer: { flex: 1 },
});
