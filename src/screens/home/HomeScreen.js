import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart } from 'react-native-gifted-charts';
import { useApp } from '../../context/AppContext';
import { useTransactions } from '../../hooks/useTransactions';
import { useSavings } from '../../hooks/useSavings';
import { useBudget } from '../../hooks/useBudget';
import { useDebts } from '../../hooks/useDebts';
import { useNotifications } from '../../hooks/useNotifications';
import { useBills } from '../../hooks/useBills';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatMonthYear, prevMonth, nextMonth } from '../../utils/formatDate';
import { TransactionItem } from '../../components/TransactionItem';
import { ProgressBar } from '../../components/ProgressBar';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '../../constants/theme';
import { getDb } from '../../database/db';

function generateAdvice(income, expense, prevExpense, savingsGoals, budgetProgress, upcomingBills, emergencyFund) {
  const tips = [];
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const needs = income * 0.50;
  const wants = income * 0.30;
  const savingsTarget = income * 0.20;

  if (upcomingBills.length > 0) {
    const names = upcomingBills.slice(0, 2).map(b => b.name).join(', ');
    tips.push({
      icon: 'warning',
      color: '#EF4444',
      title: `${upcomingBills.length} pago(s) próximo(s)`,
      body: `${names}${upcomingBills.length > 2 ? ' y más' : ''} vencen pronto.`,
    });
  }

  if (income > 0) {
    if (savingsRate < 10) {
      tips.push({
        icon: 'trending-down',
        color: '#EF4444',
        title: `Ahorro bajo: ${savingsRate.toFixed(1)}%`,
        body: 'Estás ahorrando menos del 10% de tu ingreso. Meta mínima: 20%.',
      });
    } else if (savingsRate >= 30) {
      tips.push({
        icon: 'star',
        color: '#10B981',
        title: `¡Excelente ahorro: ${savingsRate.toFixed(1)}%!`,
        body: 'Superas el 30% recomendado. Considera invertir el excedente.',
      });
    } else {
      tips.push({
        icon: 'trending-up',
        color: '#10B981',
        title: `Tasa de ahorro: ${savingsRate.toFixed(1)}%`,
        body: `Buen ritmo. Apunta al 30% para acelerar tus metas.`,
      });
    }

    if (expense > needs + wants) {
      tips.push({
        icon: 'alert-circle',
        color: '#F59E0B',
        title: 'Regla 50/30/20: gastos altos',
        body: `Con $${income.toFixed(0)} de ingreso: necesidades ≤$${needs.toFixed(0)}, ocio ≤$${wants.toFixed(0)}, ahorro ≥$${savingsTarget.toFixed(0)}.`,
      });
    }
  }

  if (prevExpense > 0 && expense > prevExpense * 1.20) {
    const pct = (((expense / prevExpense) - 1) * 100).toFixed(0);
    tips.push({
      icon: 'arrow-up-circle',
      color: '#F97316',
      title: `Gastos +${pct}% vs mes anterior`,
      body: 'Tus gastos subieron significativamente. Revisa en qué categoría.',
    });
  }

  if (budgetProgress > 0.9 && budgetProgress < Infinity) {
    tips.push({
      icon: 'wallet',
      color: '#EF4444',
      title: 'Presupuesto casi agotado',
      body: `Llevas el ${(budgetProgress * 100).toFixed(0)}% del presupuesto mensual.`,
    });
  }

  if (emergencyFund && emergencyFund.monthly_expenses > 0) {
    const fundMonths = emergencyFund.current_amount / emergencyFund.monthly_expenses;
    if (fundMonths < 3) {
      tips.push({
        icon: 'shield-outline',
        color: '#8B5CF6',
        title: `Fondo emergencia: ${fundMonths.toFixed(1)} meses`,
        body: 'Tienes menos de 3 meses de reserva. Prioriza llegar a 6 meses.',
      });
    }
  }

  if (savingsGoals.length > 0 && income > 0) {
    const activeGoals = savingsGoals.filter(g => g.current_amount < g.target_amount);
    if (activeGoals.length > 0) {
      tips.push({
        icon: 'trophy-outline',
        color: '#3B82F6',
        title: `${activeGoals.length} meta(s) activa(s)`,
        body: 'Recuerda apartar algo para tus metas de ahorro con cada cobro.',
      });
    }
  }

  if (tips.length === 0 && income > 0) {
    tips.push({
      icon: 'checkmark-circle',
      color: '#10B981',
      title: 'Finanzas en orden',
      body: 'Todo se ve bien este mes. ¡Sigue así!',
    });
  }

  return tips.slice(0, 4);
}

const { width } = Dimensions.get('window');

const SHORT_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function HomeScreen({ navigation }) {
  const { colors, currencySymbol, currencyCode, selectedMonth, selectedYear, setSelectedMonth, isDark } = useApp();
  const txHook = useTransactions();
  const savingsHook = useSavings();
  const budgetHook = useBudget();
  const debtHook = useDebts();
  const billsHook = useBills();
  const { scheduleAllNotifications } = useNotifications();

  const [usdSummary, setUsdSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [recentTx, setRecentTx] = useState([]);
  const [goals, setGoals] = useState([]);
  const [budgetSummary, setBudgetSummary] = useState({ budgeted: 0, spent: 0 });
  const [netWorth, setNetWorth] = useState(0);
  const [avgIncome, setAvgIncome] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [advice, setAdvice] = useState([]);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [monthlyTotals, setMonthlyTotals] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const prev = prevMonth(selectedMonth, selectedYear);

      // Critical queries — must succeed for core UI
      const [usdSum, recent] = await Promise.all([
        txHook.getMonthSummaryUSD(selectedMonth, selectedYear),
        txHook.fetchTransactions({ month: selectedMonth, year: selectedYear, limit: 5 }),
      ]);
      setUsdSummary(usdSum);
      setRecentTx(recent);

      // Non-critical queries — failures don't block core data
      const [gsRes, bsRes, totalSavedRes, totalDebtRes, avgRes, prevSumRes, upcomingRes, emergencyFundRes, monthlyRes] =
        await Promise.allSettled([
          savingsHook.fetchGoals(),
          budgetHook.getTotalBudgetSummary(selectedMonth, selectedYear, currencyCode),
          savingsHook.getTotalSaved(),
          debtHook.getTotalDebt(),
          txHook.getAverageIncomeUSD(3),
          txHook.getMonthSummaryUSD(prev.month, prev.year),
          billsHook.getUpcomingBills(5),
          getDb()?.getFirstAsync('SELECT * FROM emergency_fund LIMIT 1') ?? Promise.resolve(null),
          txHook.getMonthlyTotalsUSD(6),
        ]);

      const gs = gsRes.status === 'fulfilled' ? gsRes.value : [];
      const bs = bsRes.status === 'fulfilled' ? bsRes.value : { budgeted: 0, spent: 0 };
      const totalSaved = totalSavedRes.status === 'fulfilled' ? totalSavedRes.value : 0;
      const totalDebt = totalDebtRes.status === 'fulfilled' ? totalDebtRes.value : 0;
      const avg = avgRes.status === 'fulfilled' ? avgRes.value : 0;
      const prevSum = prevSumRes.status === 'fulfilled' ? prevSumRes.value : { income: 0, expense: 0, balance: 0 };
      const upcoming = upcomingRes.status === 'fulfilled' ? upcomingRes.value : [];
      const emergencyFund = emergencyFundRes.status === 'fulfilled' ? emergencyFundRes.value : null;
      const monthly = monthlyRes.status === 'fulfilled' ? monthlyRes.value : [];

      scheduleAllNotifications(selectedMonth, selectedYear).catch(() => {});
      setGoals(gs.slice(0, 3));
      setBudgetSummary(bs);
      setNetWorth(usdSum.balance + totalSaved - totalDebt);
      setAvgIncome(avg);
      setUpcomingBills(upcoming);
      setMonthlyTotals(monthly);

      const budgetProgress = bs.budgeted > 0 ? bs.spent / bs.budgeted : 0;
      const tips = generateAdvice(usdSum.income, usdSum.expense, prevSum.expense, gs, budgetProgress, upcoming, emergencyFund);
      setAdvice(tips);
    } catch (e) {
      console.error('HomeScreen loadData error:', e);
    }
  }, [selectedMonth, selectedYear, currencyCode]);

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

  const savings = usdSummary.income - usdSummary.expense;
  const savingsRate = usdSummary.income > 0 ? (savings / usdSummary.income) * 100 : 0;
  const budgetProgress = budgetSummary.budgeted > 0 ? budgetSummary.spent / budgetSummary.budgeted : 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Patrimonio neto</Text>
          <Text style={[styles.netWorth, { color: netWorth >= 0 ? colors.primary : colors.danger }]}>
            {formatCurrency(netWorth, '$')}
          </Text>
          <Text style={[styles.avgIncome, { color: colors.textTertiary }]}>
            Ingreso prom. 3m: {formatCurrency(avgIncome, '$')}
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
          <SummaryCard title="Balance" value={usdSummary.balance} color={usdSummary.balance >= 0 ? colors.primary : colors.danger} icon="trending-up" currencySymbol="$" colors={colors} />
          <SummaryCard title="Ingresos" value={usdSummary.income} color={colors.primary} icon="arrow-down-circle" currencySymbol="$" colors={colors} />
          <SummaryCard title="Gastos" value={usdSummary.expense} color={colors.danger} icon="arrow-up-circle" currencySymbol="$" colors={colors} />
          <SummaryCard title="Tasa Ahorro" value={savingsRate} isPercent icon="wallet" color={colors.info} currencySymbol="$" colors={colors} />
        </ScrollView>

        {/* Monthly Evolution */}
        {monthlyTotals.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, padding: Spacing.md, paddingBottom: Spacing.sm }]}>
              Evolución Mensual
            </Text>
            <BarChart
              data={monthlyTotals.flatMap((m) => [
                { value: m.income, label: SHORT_MONTHS[m.month - 1], frontColor: colors.primary, spacing: 2, barWidth: 18 },
                { value: m.expense, frontColor: colors.danger, spacing: 18, barWidth: 18 },
              ])}
              barWidth={18}
              spacing={2}
              roundedTop
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
              noOfSections={3}
              maxValue={Math.max(...monthlyTotals.map(m => Math.max(m.income, m.expense)), 1) * 1.15}
              width={width - Spacing.md * 4}
              height={120}
              isAnimated
              animationDuration={400}
              style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.md }}
            />
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Ingresos</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Gastos</Text>
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

        {/* Upcoming Bills */}
        {upcomingBills.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Pagos Próximos</Text>
              <TouchableOpacity onPress={() => navigation.getParent()?.navigate('MoreTab', { screen: 'Bills' })}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            {upcomingBills.map(bill => (
              <View key={bill.id} style={[styles.billItem, { borderTopColor: colors.border }]}>
                <View style={[styles.billIcon, { backgroundColor: bill.color + '22' }]}>
                  <Ionicons name={bill.icon || 'receipt'} size={16} color={bill.color} />
                </View>
                <View style={styles.billInfo}>
                  <Text style={[styles.billName, { color: colors.text }]}>{bill.name}</Text>
                  <Text style={[styles.billDue, { color: bill.daysUntilDue === 0 ? colors.danger : colors.warning }]}>
                    {bill.daysUntilDue === 0 ? '¡Vence hoy!' : `En ${bill.daysUntilDue} día(s)`}
                  </Text>
                </View>
                <Text style={[styles.billAmt, { color: colors.text }]}>
                  {bill.amount.toLocaleString('es-VE')} {bill.currency}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Financial Advice */}
        {advice.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, padding: Spacing.md, paddingBottom: 0 }]}>
              Consejos Financieros
            </Text>
            {advice.map((tip, i) => (
              <View
                key={i}
                style={[
                  styles.tipItem,
                  i < advice.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.tipIcon, { backgroundColor: tip.color + '20' }]}>
                  <Ionicons name={tip.icon} size={18} color={tip.color} />
                </View>
                <View style={styles.tipText}>
                  <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title}</Text>
                  <Text style={[styles.tipBody, { color: colors.textSecondary }]}>{tip.body}</Text>
                </View>
              </View>
            ))}
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
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  billIcon: { width: 32, height: 32, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  billInfo: { flex: 1 },
  billName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  billDue: { fontSize: FontSize.xs, marginTop: 1 },
  billAmt: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  tipIcon: { width: 36, height: 36, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1 },
  tipTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: 2 },
  tipBody: { fontSize: FontSize.xs, lineHeight: 16 },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs },
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
