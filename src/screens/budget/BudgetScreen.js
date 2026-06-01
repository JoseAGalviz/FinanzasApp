import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useBudget } from '../../hooks/useBudget';
import { useTransactions } from '../../hooks/useTransactions';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatMonthYear } from '../../utils/formatDate';
import { calculate502030 } from '../../utils/calculations';
import { getCategoryById, EXPENSE_CATEGORIES } from '../../constants/categories';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { AmountInput } from '../../components/Input';
import { BorderRadius, FontSize, FontWeight, Spacing, getCurrencySymbol } from '../../constants/theme';
import { CurrencyPicker } from '../../components/CurrencyPicker';

export default function BudgetScreen() {
  const { colors, currencySymbol, currencyCode, selectedMonth, selectedYear } = useApp();
  const { budgets, fetchBudgets, setBudgetLimit, deleteBudget, getTotalBudgetSummary, applyRule502030 } = useBudget();
  const { getAverageIncome, getMonthSummary } = useTransactions();

  const [totalSummary, setTotalSummary] = useState({ budgeted: 0, spent: 0 });
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [limitAmount, setLimitAmount] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState(currencyCode || 'USD');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avgIncome, setAvgIncome] = useState(0);

  const loadData = useCallback(async () => {
    const [bs, ts, avg] = await Promise.all([
      fetchBudgets(selectedMonth, selectedYear),
      getTotalBudgetSummary(selectedMonth, selectedYear, currencyCode),
      getAverageIncome(3, currencyCode),
    ]);
    setTotalSummary(ts);
    setAvgIncome(avg);
  }, [selectedMonth, selectedYear]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  function openAddBudget(cat) {
    const existing = budgets.find(b => b.category_id === cat.id);
    setSelectedCat(cat);
    setLimitAmount(existing ? String(existing.limit_amount) : '');
    setBudgetCurrency(existing?.currency || currencyCode || 'USD');
    setShowAddBudget(true);
  }

  async function handleSaveBudget() {
    if (!limitAmount || parseFloat(limitAmount) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    setSaving(true);
    try {
      await setBudgetLimit(selectedCat.id, selectedMonth, selectedYear, limitAmount, budgetCurrency);
      setShowAddBudget(false);
      loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleApply502030() {
    if (!avgIncome) { Alert.alert('Sin datos', 'No hay ingresos registrados para calcular el 50/30/20'); return; }
    Alert.alert(
      'Aplicar 50/30/20',
      `Basado en tu ingreso promedio de ${formatCurrency(avgIncome, currencySymbol)}, se configurarán los presupuestos automáticamente. ¿Continuar?`,
      [
        { text: 'Cancelar' },
        { text: 'Aplicar', onPress: async () => {
          await applyRule502030(avgIncome, selectedMonth, selectedYear, currencyCode);
          loadData();
        }},
      ]
    );
  }

  const rule = calculate502030(avgIncome);
  const budgetProgress = totalSummary.budgeted > 0 ? totalSummary.spent / totalSummary.budgeted : 0;
  const overBudget = budgets.filter(b => b.progress >= 0.9);

  const configuredIds = new Set(budgets.map(b => b.category_id));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>{formatMonthYear(selectedMonth, selectedYear)}</Text>

        {/* Overview */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Resumen General</Text>
          <View style={styles.overviewRow}>
            <OverviewStat label="Presupuestado" value={formatCurrency(totalSummary.budgeted, currencySymbol)} color={colors.info} colors={colors} />
            <OverviewStat label="Gastado" value={formatCurrency(totalSummary.spent, currencySymbol)} color={colors.danger} colors={colors} />
            <OverviewStat label="Disponible" value={formatCurrency(totalSummary.budgeted - totalSummary.spent, currencySymbol)} color={totalSummary.budgeted - totalSummary.spent >= 0 ? colors.primary : colors.danger} colors={colors} />
          </View>
          {totalSummary.budgeted > 0 && (
            <View style={[styles.globalTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.globalFill, { width: `${Math.min(budgetProgress * 100, 100)}%`, backgroundColor: budgetProgress >= 0.9 ? colors.danger : budgetProgress >= 0.7 ? colors.warning : colors.primary }]} />
            </View>
          )}
        </Card>

        {/* Alerts */}
        {overBudget.length > 0 && (
          <Card>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={18} color={colors.danger} />
              <Text style={[styles.alertTitle, { color: colors.danger }]}>{overBudget.length} categoría(s) cerca del límite</Text>
            </View>
            {overBudget.map(b => {
              const cat = getCategoryById(b.category_id, 'expense');
              return (
                <Text key={b.category_id} style={[styles.alertItem, { color: colors.textSecondary }]}>
                  · {cat.name}: {Math.round(b.progress * 100)}% usado
                </Text>
              );
            })}
          </Card>
        )}

        {/* 50/30/20 Suggestion */}
        {avgIncome > 0 && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Regla 50/30/20</Text>
            <Text style={[styles.ruleDesc, { color: colors.textSecondary }]}>
              Basado en tu ingreso promedio de {formatCurrency(avgIncome, currencySymbol)}:
            </Text>
            <View style={styles.ruleRow}>
              <RuleItem label="Necesidades (50%)" value={formatCurrency(rule.needs, currencySymbol)} color={colors.info} colors={colors} />
              <RuleItem label="Deseos (30%)" value={formatCurrency(rule.wants, currencySymbol)} color={colors.purple} colors={colors} />
              <RuleItem label="Ahorro (20%)" value={formatCurrency(rule.savings, currencySymbol)} color={colors.primary} colors={colors} />
            </View>
            <Button title="Aplicar automáticamente" variant="outline" onPress={handleApply502030} size="sm" />
          </Card>
        )}

        {/* Category Budgets */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Por Categoría</Text>
        {EXPENSE_CATEGORIES.map(cat => {
          const budget = budgets.find(b => b.category_id === cat.id);
          const spent = budget?.spent || 0;
          const limit = budget?.limit_amount || 0;
          const budSym = getCurrencySymbol(budget?.currency || currencyCode);

          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => openAddBudget(cat)}
              style={[styles.catRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                <Ionicons name={cat.icon} size={20} color={cat.color} />
              </View>
              <View style={styles.catInfo}>
                <View style={styles.catHeader}>
                  <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
                  <Text style={[styles.catAmt, { color: limit > 0 ? colors.textSecondary : colors.textTertiary }]}>
                    {limit > 0 ? `${formatCurrency(spent, budSym)} / ${formatCurrency(limit, budSym)}` : 'Sin límite'}
                  </Text>
                </View>
                {limit > 0 && (
                  <View style={[styles.catTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.catFill, {
                      width: `${Math.min((spent / limit) * 100, 100)}%`,
                      backgroundColor: (spent / limit) >= 0.9 ? colors.danger : (spent / limit) >= 0.7 ? colors.warning : colors.primary,
                    }]} />
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={showAddBudget} onClose={() => setShowAddBudget(false)} title={selectedCat ? `Presupuesto: ${selectedCat.name}` : 'Presupuesto'}>
        <CurrencyPicker label="Moneda" value={budgetCurrency} onChange={setBudgetCurrency} colors={colors} />
        <AmountInput label="Límite mensual" value={limitAmount} onChangeText={setLimitAmount} />
        <Button title="Guardar" onPress={handleSaveBudget} loading={saving} style={{ marginBottom: Spacing.sm }} />
        {budgets.find(b => b.category_id === selectedCat?.id) && (
          <Button title="Eliminar límite" variant="danger" onPress={async () => {
            const b = budgets.find(x => x.category_id === selectedCat.id);
            if (b) { await deleteBudget(b.id); setShowAddBudget(false); loadData(); }
          }} />
        )}
      </Modal>
    </View>
  );
}

function OverviewStat({ label, value, color, colors }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[{ fontSize: FontSize.sm, fontWeight: FontWeight.bold, color }]}>{value}</Text>
      <Text style={[{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

function RuleItem({ label, value, color, colors }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[{ fontSize: FontSize.md, fontWeight: FontWeight.bold, color }]}>{value}</Text>
      <Text style={[{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  monthLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
  overviewRow: { flexDirection: 'row', marginBottom: Spacing.md },
  globalTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  globalFill: { height: '100%', borderRadius: 4 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  alertTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  alertItem: { fontSize: FontSize.sm, marginBottom: 2 },
  ruleDesc: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  ruleRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  catIcon: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  catInfo: { flex: 1 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  catName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  catAmt: { fontSize: FontSize.xs },
  catTrack: { height: 5, borderRadius: 2.5, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 2.5 },
});
