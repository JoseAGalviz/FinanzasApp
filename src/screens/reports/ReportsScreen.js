import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, RefreshControl,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useTransactions } from '../../hooks/useTransactions';
import { useBudget } from '../../hooks/useBudget';
import { formatCurrency, formatPercent } from '../../utils/formatCurrency';
import { formatMonthYear, prevMonth, nextMonth, formatMonthYearShort } from '../../utils/formatDate';
import { getCategoryById } from '../../constants/categories';
import { Card } from '../../components/Card';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - Spacing.lg * 2 - 32;

export default function ReportsScreen() {
  const { colors, currencySymbol, currencyCode, selectedMonth, selectedYear, setSelectedMonth } = useApp();
  const txHook = useTransactions();
  const budgetHook = useBudget();

  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [prevSummary, setPrevSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [monthly, setMonthly] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [insights, setInsights] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('overview');

  const loadData = useCallback(async () => {
    const prev = prevMonth(selectedMonth, selectedYear);
    const [sum, prevSum, monthly, breakdown, bud] = await Promise.all([
      txHook.getMonthSummary(selectedMonth, selectedYear, currencyCode),
      txHook.getMonthSummary(prev.month, prev.year, currencyCode),
      txHook.getMonthlyTotals(6, currencyCode),
      txHook.getCategoryBreakdown(selectedMonth, selectedYear, 'expense', currencyCode),
      budgetHook.fetchBudgets(selectedMonth, selectedYear, currencyCode),
    ]);
    setSummary(sum);
    setPrevSummary(prevSum);
    setMonthly(monthly);
    setBreakdown(breakdown);
    setBudgets(bud);
    setInsights(generateInsights(sum, prevSum, breakdown, colors));
  }, [selectedMonth, selectedYear, colors]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const savingsRate = summary.income > 0 ? ((summary.income - summary.expense) / summary.income) * 100 : 0;

  const barData = monthly.map(m => ({
    value: m.income,
    label: formatMonthYearShort(m.month, m.year).slice(0, 3),
    frontColor: colors.primary + 'CC',
    sideColor: colors.primary + '88',
    topColor: colors.primary,
  }));

  const expenseBarData = monthly.map(m => ({
    value: m.expense,
    label: formatMonthYearShort(m.month, m.year).slice(0, 3),
    frontColor: colors.danger + 'CC',
  }));

  const totalExpense = breakdown.reduce((s, b) => s + b.total, 0);
  const pieData = breakdown.slice(0, 6).map(b => {
    const cat = getCategoryById(b.category, 'expense');
    return { value: b.total, color: cat.color, label: cat.name, text: cat.name };
  });

  const lineData = monthly.map(m => ({ value: m.income - m.expense }));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Month nav */}
      <View style={[styles.monthBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { const p = prevMonth(selectedMonth, selectedYear); setSelectedMonth(p.month, p.year); }}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>{formatMonthYear(selectedMonth, selectedYear)}</Text>
        <TouchableOpacity onPress={() => { const n = nextMonth(selectedMonth, selectedYear); setSelectedMonth(n.month, n.year); }}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[['overview', 'Resumen'], ['spending', 'Gastos'], ['trends', 'Tendencias']].map(([k, label]) => (
          <TouchableOpacity
            key={k}
            onPress={() => setTab(k)}
            style={[styles.tabItem, tab === k && { borderBottomColor: colors.primary }]}
          >
            <Text style={[styles.tabText, { color: tab === k ? colors.primary : colors.textSecondary }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {tab === 'overview' && (
          <>
            {/* KPI Cards */}
            <View style={styles.kpiRow}>
              <KPICard title="Ingresos" value={formatCurrency(summary.income, currencySymbol)} numValue={summary.income} prevValue={prevSummary.income} color={colors.primary} colors={colors} currencySymbol={currencySymbol} />
              <KPICard title="Gastos" value={formatCurrency(summary.expense, currencySymbol)} numValue={summary.expense} prevValue={prevSummary.expense} color={colors.danger} colors={colors} currencySymbol={currencySymbol} invertChange />
              <KPICard title="Ahorro" value={formatCurrency(summary.balance, currencySymbol)} numValue={summary.balance} prevValue={prevSummary.balance} color={colors.info} colors={colors} currencySymbol={currencySymbol} />
              <KPICard title="Tasa Ahorro" value={formatPercent(savingsRate)} numValue={savingsRate} prevValue={prevSummary.income > 0 ? ((prevSummary.income - prevSummary.expense) / prevSummary.income) * 100 : 0} color={colors.purple} colors={colors} currencySymbol={currencySymbol} isPercent />
            </View>

            {/* Insights */}
            {insights.length > 0 && (
              <Card>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Insights</Text>
                {insights.map((ins, i) => (
                  <View key={i} style={[styles.insightRow, { borderTopColor: colors.divider, borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0 }]}>
                    <Ionicons name={ins.icon} size={18} color={ins.color} />
                    <Text style={[styles.insightText, { color: colors.textSecondary }]}>{ins.text}</Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Bar chart income vs expense */}
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Ingresos vs Gastos (6 meses)</Text>
              {monthly.length > 0 && (
                <BarChart
                  data={barData}
                  data2={expenseBarData}
                  width={CHART_WIDTH}
                  height={180}
                  barWidth={14}
                  spacing={8}
                  noOfSections={4}
                  barBorderRadius={3}
                  yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
                  hideRules
                  isAnimated
                />
              )}
              <View style={styles.legend}>
                <LegendDot color={colors.primary} label="Ingresos" colors={colors} />
                <LegendDot color={colors.danger} label="Gastos" colors={colors} />
              </View>
            </Card>
          </>
        )}

        {tab === 'spending' && (
          <>
            {/* Pie chart */}
            {pieData.length > 0 ? (
              <Card>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Distribución de Gastos</Text>
                <View style={styles.pieContainer}>
                  <PieChart
                    data={pieData}
                    donut
                    innerRadius={60}
                    radius={100}
                    showText={false}
                    isAnimated
                    centerLabelComponent={() => (
                      <View style={styles.pieCenter}>
                        <Text style={[styles.pieCenterVal, { color: colors.text }]}>
                          {formatCurrency(totalExpense, currencySymbol)}
                        </Text>
                        <Text style={[styles.pieCenterLabel, { color: colors.textSecondary }]}>Total</Text>
                      </View>
                    )}
                  />
                </View>
                {breakdown.slice(0, 6).map(b => {
                  const cat = getCategoryById(b.category, 'expense');
                  const pct = totalExpense > 0 ? (b.total / totalExpense) * 100 : 0;
                  return (
                    <View key={b.category} style={styles.breakdownRow}>
                      <View style={[styles.dot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.breakdownLabel, { color: colors.text }]}>{cat.name}</Text>
                      <Text style={[styles.breakdownPct, { color: colors.textSecondary }]}>{pct.toFixed(1)}%</Text>
                      <Text style={[styles.breakdownAmt, { color: colors.text }]}>{formatCurrency(b.total, currencySymbol)}</Text>
                    </View>
                  );
                })}
              </Card>
            ) : (
              <Card><Text style={[styles.emptyNote, { color: colors.textSecondary }]}>Sin gastos este mes</Text></Card>
            )}

            {/* Top 5 */}
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Top 5 Categorías</Text>
              {breakdown.slice(0, 5).map((b, i) => {
                const cat = getCategoryById(b.category, 'expense');
                const budget = budgets.find(bud => bud.category_id === b.category);
                const progress = budget && budget.limit_amount > 0 ? Math.min(1, b.total / budget.limit_amount) : 0;
                return (
                  <View key={b.category} style={styles.topRow}>
                    <Text style={[styles.topNum, { color: colors.textTertiary }]}>#{i + 1}</Text>
                    <Ionicons name={cat.icon} size={18} color={cat.color} />
                    <View style={styles.topInfo}>
                      <Text style={[styles.topName, { color: colors.text }]}>{cat.name}</Text>
                      {budget && (
                        <View style={[styles.topTrack, { backgroundColor: colors.border }]}>
                          <View style={[styles.topFill, { width: `${progress * 100}%`, backgroundColor: progress >= 0.9 ? colors.danger : progress >= 0.7 ? colors.warning : colors.primary }]} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.topAmt, { color: colors.text }]}>{formatCurrency(b.total, currencySymbol)}</Text>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {tab === 'trends' && (
          <>
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Evolución del Balance</Text>
              {lineData.length > 0 && (
                <LineChart
                  data={lineData}
                  width={CHART_WIDTH}
                  height={200}
                  color={colors.info}
                  thickness={2.5}
                  dataPointsColor={colors.info}
                  startFillColor={colors.info + '44'}
                  endFillColor={colors.info + '08'}
                  areaChart
                  yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
                  hideRules
                  isAnimated
                />
              )}
              <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>Últimos 6 meses</Text>
            </Card>

            {/* Month comparison */}
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>vs Mes Anterior</Text>
              {[
                ['Ingresos', summary.income, prevSummary.income, colors.primary],
                ['Gastos', summary.expense, prevSummary.expense, colors.danger],
                ['Ahorro', summary.income - summary.expense, prevSummary.income - prevSummary.expense, colors.info],
              ].map(([label, curr, prev, color]) => {
                const diff = curr - prev;
                const pct = prev > 0 ? (diff / prev) * 100 : 0;
                return (
                  <View key={label} style={[styles.compRow, { borderBottomColor: colors.divider }]}>
                    <Text style={[styles.compLabel, { color: colors.textSecondary }]}>{label}</Text>
                    <Text style={[styles.compVal, { color }]}>{formatCurrency(curr, currencySymbol)}</Text>
                    <Text style={[styles.compDiff, { color: diff >= 0 ? colors.primary : colors.danger }]}>
                      {diff >= 0 ? '+' : ''}{pct.toFixed(1)}%
                    </Text>
                  </View>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function KPICard({ title, value, numValue, prevValue, color, colors, currencySymbol, invertChange, isPercent }) {
  const diff = numValue - prevValue;
  const pct = prevValue > 0 ? (diff / prevValue) * 100 : 0;
  const positive = invertChange ? diff <= 0 : diff >= 0;
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.kpiTitle, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.kpiVal, { color }]} numberOfLines={1}>{value}</Text>
      <View style={styles.kpiChange}>
        <Ionicons name={pct >= 0 ? 'trending-up' : 'trending-down'} size={11} color={positive ? colors.primary : colors.danger} />
        <Text style={[styles.kpiPct, { color: positive ? colors.primary : colors.danger }]}>
          {Math.abs(pct).toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

function LegendDot({ color, label, colors }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function generateInsights(sum, prev, breakdown, colors) {
  const ins = [];
  if (sum.income > 0 && prev.income > 0) {
    const incomePct = ((sum.income - prev.income) / prev.income) * 100;
    if (Math.abs(incomePct) > 5) {
      ins.push({
        icon: incomePct > 0 ? 'trending-up' : 'trending-down',
        color: incomePct > 0 ? colors.primary : colors.warning,
        text: `Tus ingresos ${incomePct > 0 ? 'subieron' : 'bajaron'} un ${Math.abs(incomePct).toFixed(1)}% vs el mes anterior`,
      });
    }
  }
  const savingsRate = sum.income > 0 ? ((sum.income - sum.expense) / sum.income) * 100 : 0;
  if (savingsRate < 10) ins.push({ icon: 'alert-circle', color: colors.warning, text: 'Tu tasa de ahorro es menor al 10%. Intenta reducir gastos o aumentar ingresos.' });
  else if (savingsRate >= 20) ins.push({ icon: 'checkmark-circle', color: colors.primary, text: `¡Excelente! Estás ahorrando el ${savingsRate.toFixed(1)}% de tus ingresos.` });

  if (breakdown.length > 0) {
    const top = breakdown[0];
    const cat = getCategoryById(top.category, 'expense');
    ins.push({ icon: 'pie-chart', color: colors.info, text: `Tu mayor gasto es "${cat.name}" con ${formatCurrency(top.total, '$')}.` });
  }
  return ins;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.xl },
  monthText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  kpiTitle: { fontSize: FontSize.xs, marginBottom: 4 },
  kpiVal: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: 4 },
  kpiChange: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  kpiPct: { fontSize: FontSize.xs },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: Spacing.sm },
  insightText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  legend: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendLabel: { fontSize: FontSize.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pieContainer: { alignItems: 'center', marginVertical: Spacing.md },
  pieCenter: { alignItems: 'center' },
  pieCenterVal: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  pieCenterLabel: { fontSize: FontSize.xs },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  breakdownLabel: { flex: 1, fontSize: FontSize.sm },
  breakdownPct: { fontSize: FontSize.xs, width: 40, textAlign: 'right' },
  breakdownAmt: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, width: 80, textAlign: 'right' },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  topNum: { fontSize: FontSize.xs, width: 20 },
  topInfo: { flex: 1 },
  topName: { fontSize: FontSize.sm, marginBottom: 4 },
  topTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  topFill: { height: 4 },
  topAmt: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  compRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  compLabel: { flex: 1, fontSize: FontSize.sm },
  compVal: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, width: 90, textAlign: 'right' },
  compDiff: { fontSize: FontSize.xs, width: 60, textAlign: 'right' },
  chartLabel: { fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.sm },
  emptyNote: { fontSize: FontSize.sm, textAlign: 'center', padding: Spacing.lg },
});
