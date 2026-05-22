import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useTransactions } from '../../hooks/useTransactions';
import { TransactionItem, TransactionGroup } from '../../components/TransactionItem';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmModal } from '../../components/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatMonthYear, prevMonth, nextMonth } from '../../utils/formatDate';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/theme';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants/categories';

export default function TransactionsScreen({ navigation }) {
  const { colors, currencySymbol, selectedMonth, selectedYear, setSelectedMonth } = useApp();
  const { transactions, loading, fetchTransactions, deleteTransaction, getMonthSummary } = useTransactions();

  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    await fetchTransactions({ month: selectedMonth, year: selectedYear });
    const s = await getMonthSummary(selectedMonth, selectedYear);
    setSummary(s);
  }, [selectedMonth, selectedYear]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (filterType !== 'all') list = list.filter(t => t.type === filterType);
    if (filterCategory !== 'all') list = list.filter(t => t.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.description?.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, filterType, filterCategory, search]);

  const grouped = useMemo(() => {
    const map = {};
    for (const t of filtered) {
      const key = formatDate(t.date, 'EEEE, d MMMM');
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return Object.entries(map);
  }, [filtered]);

  async function handleDelete(tx) {
    await deleteTransaction(tx.id);
    setConfirmDelete(null);
    loadData();
  }

  const categories = filterType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Summary bar */}
      <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => { const p = prevMonth(selectedMonth, selectedYear); setSelectedMonth(p.month, p.year); }}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: colors.text }]}>{formatMonthYear(selectedMonth, selectedYear)}</Text>
          <TouchableOpacity onPress={() => { const n = nextMonth(selectedMonth, selectedYear); setSelectedMonth(n.month, n.year); }}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ingresos</Text>
            <Text style={[styles.summaryVal, { color: colors.primary }]}>{formatCurrency(summary.income, currencySymbol)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Gastos</Text>
            <Text style={[styles.summaryVal, { color: colors.danger }]}>{formatCurrency(summary.expense, currencySymbol)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Balance</Text>
            <Text style={[styles.summaryVal, { color: summary.balance >= 0 ? colors.primary : colors.danger }]}>
              {formatCurrency(summary.balance, currencySymbol)}
            </Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar..."
          placeholderTextColor={colors.placeholder}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {[
          { key: 'all', label: 'Todos' },
          { key: 'income', label: 'Ingresos' },
          { key: 'expense', label: 'Gastos' },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => { setFilterType(f.key); setFilterCategory('all'); }}
            style={[styles.pill, { backgroundColor: filterType === f.key ? colors.primary : colors.surfaceAlt, borderColor: filterType === f.key ? colors.primary : colors.border }]}
          >
            <Text style={[styles.pillText, { color: filterType === f.key ? '#fff' : colors.textSecondary }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        {filterType !== 'all' && categories.map(c => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setFilterCategory(filterCategory === c.id ? 'all' : c.id)}
            style={[styles.pill, { backgroundColor: filterCategory === c.id ? c.color : colors.surfaceAlt, borderColor: c.color }]}
          >
            <Text style={[styles.pillText, { color: filterCategory === c.id ? '#fff' : colors.textSecondary }]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
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
          !loading && (
            <EmptyState
              icon="receipt-outline"
              title="Sin transacciones"
              subtitle="Agrega tu primera transacción con el botón +"
            />
          )
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddTransaction')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <ConfirmModal
        visible={!!confirmDelete}
        title="Eliminar transacción"
        message="¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer."
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  summaryBar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.sm },
  monthText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: FontSize.xs },
  summaryVal: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm },
  filterScroll: { maxHeight: 44, marginBottom: Spacing.xs },
  filterRow: { paddingHorizontal: Spacing.md, gap: Spacing.xs, alignItems: 'center' },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
