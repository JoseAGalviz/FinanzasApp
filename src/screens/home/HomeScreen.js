import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useTransactions } from '../../hooks/useTransactions';
import { useSavings } from '../../hooks/useSavings';
import { useBudget } from '../../hooks/useBudget';
import { useInvestments } from '../../hooks/useInvestments';
import { useDebts } from '../../hooks/useDebts';
import { useNotifications } from '../../hooks/useNotifications';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatMonthYear, prevMonth, nextMonth } from '../../utils/formatDate';
import { TransactionItem } from '../../components/TransactionItem';
import { ProgressBar } from '../../components/ProgressBar';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { colors, currencySymbol, currencyCode, selectedMonth, selectedYear, setSelectedMonth, isDark } = useApp();
  const txHook = useTransactions();
  const savingsHook = useSavings();
  const budgetHook = useBudget();
  const investHook = useInvestments();
  const debtHook = useDebts();
  const { scheduleAllNotifications } = useNotifications();

  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [usdSummary, setUsdSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [recentTx, setRecentTx] = useState([]);
  const [goals, setGoals] = useState([]);
  const [budgetSummary, setBudgetSummary] = useState({ budgeted: 0, spent: 0 });
  const [netWorth, setNetWorth] = useState(0);
  const [avgIncome, setAvgIncome] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sum, usdSum, recent, gs, bs, portfolio, totalDebt, avg] = await Promise.all([
        txHook.getMonthSummary(selectedMonth, selectedYear, currencyCode),
        txHook.getMonthSummaryUSD(selectedMonth, selectedYear),
        txHook.fetchTransactions({ month: selectedMonth, year: selectedYear, limit: 5 }),
        savingsHook.fetchGoals(),
        budgetHook.getTotalBudgetSummary(selectedMonth, selectedYear, currencyCode),
        investHook.getPortfolioSummary(),
        debtHook.getTotalDebt(),
        txHook.getAverageIncome(3, currencyCode),
      ]);
      scheduleAllNotifications(selectedMonth, selectedYear);
      setSummary(sum);
      setUsdSummary(usdSum);
      setRecentTx(recent);
      setGoals(gs.slice(0, 3));
      setBudgetSummary(bs);
      setNetWorth(portfolio.totalValue - totalDebt);
      setAvgIncome(avg);
    } catch (e) {
      console.error('HomeScreen loadData error:', e);
    }
  }, [selectedMonth, selectedYear]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  function goToPrev() {
    const { month, year } = prevMonth(selectedMonth, selectedYear);
    setSelectedMonth(month, year);
  }

  function goToNext() {
    const { month, year } = nextMonth(selectedMonth, selectedYear);
    setSelectedMonth(month, year);
  }

  const savings = summary.income - summary.expense;
  const savingsRate = summary.income > 0 ? (savings / summary.income) * 100 : 0;
  const budgetProgress = budgetSummary.budgeted > 0 ? budgetSummary.spent / budgetSummary.budgeted : 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Patrimonio neto</Text>
          <Text style={[styles.netWorth, { color: netWorth >= 0 ? colors.primary : colors.danger }]}>
            {formatCurrency(netWorth, currencySymbol)}
          </Text>
          <Text style={[styles.avgIncome, { color: colors.textTertiary }]}>
            Ingreso prom. 3m: {formatCurrency(avgIncome, currencySymbol)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.getParent()?.navigate('MoreTab', { screen: 'Settings' })}
          style={styles.settingsBtn}
        >
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Month Selector */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={goToPrev} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.text }]}>
            {formatMonthYear(selectedMonth, selectedYear)}
          </Text>
          <TouchableOpacity onPress={goToNext} style={styles.monthBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll} contentContainerStyle={styles.cardsRow}>
          <SummaryCard title="Balance" value={summary.balance} color={summary.balance >= 0 ? colors.primary : colors.danger} icon="trending-up" currencySymbol={currencySymbol} colors={colors} />
          <SummaryCard title="Ingresos" value={summary.income} color={colors.primary} icon="arrow-down-circle" currencySymbol={currencySymbol} colors={colors} />
          <SummaryCard title="Gastos" value={summary.expense} color={colors.danger} icon="arrow-up-circle" currencySymbol={currencySymbol} colors={colors} />
          <SummaryCard title="Tasa Ahorro" value={savingsRate} isPercent icon="wallet" color={colors.info} currencySymbol={currencySymbol} colors={colors} />
        </ScrollView>

        {/* USD Equivalent */}
        {(usdSummary.income > 0 || usdSummary.expense > 0) && (
          <View style={[styles.usdCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.usdHeader}>
              <Ionicons name="swap-horizontal" size={14} color={colors.textTertiary} />
              <Text style={[styles.usdLabel, { color: colors.textTertiary }]}>Equivalente USD (todas las monedas)</Text>
            </View>
            <View style={styles.usdRow}>
              <View style={styles.usdItem}>
                <Text style={[styles.usdItemLabel, { color: colors.textSecondary }]}>Ingresos</Text>
                <Text style={[styles.usdItemValue, { color: colors.primary }]}>{formatCurrency(usdSummary.income, '$')}</Text>
              </View>
              <View style={[styles.usdDivider, { backgroundColor: colors.border }]} />
              <View style={styles.usdItem}>
                <Text style={[styles.usdItemLabel, { color: colors.textSecondary }]}>Gastos</Text>
                <Text style={[styles.usdItemValue, { color: colors.danger }]}>{formatCurrency(usdSummary.expense, '$')}</Text>
              </View>
              <View style={[styles.usdDivider, { backgroundColor: colors.border }]} />
              <View style={styles.usdItem}>
                <Text style={[styles.usdItemLabel, { color: colors.textSecondary }]}>Balance</Text>
                <Text style={[styles.usdItemValue, { color: usdSummary.balance >= 0 ? colors.primary : colors.danger }]}>
                  {formatCurrency(usdSummary.balance, '$')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Budget Progress */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Presupuesto del Mes</Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('MoreTab', { screen: 'Budget' })}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todo</Text>
            </TouchableOpacity>
          </View>
          {budgetSummary.budgeted > 0 ? (
            <>
              <ProgressBar progress={budgetProgress} showPercent label={`${formatCurrency(budgetSummary.spent, currencySymbol)} de ${formatCurrency(budgetSummary.budgeted, currencySymbol)}`} />
              {budgetProgress >= 0.9 && (
                <View style={[styles.alert, { backgroundColor: colors.dangerLight }]}>
                  <Ionicons name="warning" size={14} color={colors.danger} />
                  <Text style={[styles.alertText, { color: colors.danger }]}>Presupuesto casi agotado</Text>
                </View>
              )}
            </>
          ) : (
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('MoreTab', { screen: 'Budget' })}>
              <Text style={[styles.emptyNote, { color: colors.textSecondary }]}>Configura tu presupuesto →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Transactions */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Últimas Transacciones</Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('TransactionTab')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {recentTx.length > 0 ? (
            recentTx.map(t => (
              <TransactionItem
                key={t.id}
                transaction={t}
                onPress={() => navigation.getParent()?.navigate('TransactionTab', {
                  screen: 'AddTransaction',
                  params: { transaction: t },
                })}
              />
            ))
          ) : (
            <Text style={[styles.emptyNote, { color: colors.textSecondary }]}>Sin transacciones este mes</Text>
          )}
        </View>

        {/* Savings Goals */}
        {goals.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Metas de Ahorro</Text>
              <TouchableOpacity onPress={() => navigation.getParent()?.navigate('SavingsTab')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            {goals.map(goal => {
              const progress = goal.target_amount > 0 ? goal.current_amount / goal.target_amount : 0;
              return (
                <View key={goal.id} style={styles.goalItem}>
                  <View style={[styles.goalIcon, { backgroundColor: goal.color + '22' }]}>
                    <Ionicons name={goal.icon} size={18} color={goal.color} />
                  </View>
                  <View style={styles.goalInfo}>
                    <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
                    <ProgressBar progress={progress} color={goal.color} height={6} />
                    <Text style={[styles.goalAmt, { color: colors.textSecondary }]}>
                      {formatCurrency(goal.current_amount, currencySymbol)} / {formatCurrency(goal.target_amount, currencySymbol)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({ title, value, color, icon, currencySymbol, isPercent, colors }) {
  const display = isPercent ? `${value.toFixed(1)}%` : formatCurrency(value, currencySymbol);
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.cardIconCircle, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.cardValue, { color }]} numberOfLines={1}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  greeting: { fontSize: FontSize.sm, marginBottom: 2 },
  netWorth: { fontSize: 28, fontWeight: FontWeight.bold },
  avgIncome: { fontSize: FontSize.xs, marginTop: 2 },
  settingsBtn: { padding: Spacing.sm },
  scroll: { paddingBottom: Spacing.xxl },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  monthBtn: { padding: Spacing.sm },
  monthLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, minWidth: 160, textAlign: 'center' },
  cardsScroll: { marginBottom: Spacing.md },
  cardsRow: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  summaryCard: {
    width: 150,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadow.sm,
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginBottom: 4 },
  cardValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  seeAll: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  emptyNote: { fontSize: FontSize.sm, padding: Spacing.md, paddingTop: 0 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    marginTop: 0,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  alertText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInfo: { flex: 1 },
  goalName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.xs },
  goalAmt: { fontSize: FontSize.xs, marginTop: 2 },
  usdCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  usdHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  usdLabel: { fontSize: FontSize.xs },
  usdRow: { flexDirection: 'row', alignItems: 'center' },
  usdItem: { flex: 1, alignItems: 'center' },
  usdItemLabel: { fontSize: FontSize.xs, marginBottom: 2 },
  usdItemValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  usdDivider: { width: 1, height: 32 },
});
