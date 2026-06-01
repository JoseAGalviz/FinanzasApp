import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useSavings } from '../../hooks/useSavings';
import { useEmergencyFund } from '../../hooks/useEmergencyFund';
import { formatCurrency } from '../../utils/formatCurrency';
import { calculateMonthlySavingsNeeded } from '../../utils/calculations';
import { daysUntil, formatDate } from '../../utils/formatDate';
import { EmptyState } from '../../components/EmptyState';
import { ProgressBar } from '../../components/ProgressBar';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing, getCurrencySymbol } from '../../constants/theme';

export default function SavingsScreen({ navigation }) {
  const { colors, currencySymbol } = useApp();
  const { goals, loading, fetchGoals } = useSavings();
  const { fund, fetchFund } = useEmergencyFund();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    fetchGoals();
    fetchFund();
  }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchGoals(), fetchFund()]);
    setRefreshing(false);
  }, []);

  const totalSaved = goals.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0);
  const totalTarget = goals.reduce((s, g) => s + parseFloat(g.target_amount || 0), 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Summary */}
        <View style={[styles.summary, { backgroundColor: colors.primary }]}>
          <Text style={styles.summaryLabel}>Total Ahorrado</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalSaved, currencySymbol)}</Text>
          <Text style={styles.summaryTarget}>Meta total: {formatCurrency(totalTarget, currencySymbol)}</Text>
        </View>

        {/* Emergency Fund Card */}
        <TouchableOpacity
          style={[styles.efCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('EmergencyFund')}
        >
          <View style={styles.efHeader}>
            <View style={[styles.efIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="shield-checkmark" size={22} color={colors.warning} />
            </View>
            <View style={styles.efInfo}>
              <Text style={[styles.efTitle, { color: colors.text }]}>Fondo de Emergencia</Text>
              {fund ? (
                <>
                  <Text style={[styles.efSub, { color: colors.textSecondary }]}>
                    {fund.target_months} meses · {formatCurrency(fund.current_amount, currencySymbol)} / {formatCurrency(fund.target_amount, currencySymbol)}
                  </Text>
                  <ProgressBar progress={fund.progress} color={colors.warning} height={5} style={{ marginTop: Spacing.xs }} />
                </>
              ) : (
                <Text style={[styles.efSub, { color: colors.textSecondary }]}>Configura tu fondo →</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>

        {/* Goals Header */}
        <View style={styles.goalsHeader}>
          <Text style={[styles.goalsTitle, { color: colors.text }]}>Metas de Ahorro</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddGoal')}
            style={[styles.addBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>Nueva Meta</Text>
          </TouchableOpacity>
        </View>

        {/* Goals List */}
        {goals.length > 0 ? (
          goals.map(goal => <GoalCard key={goal.id} goal={goal} colors={colors} onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id })} onEdit={() => navigation.navigate('AddGoal', { goal })} />)
        ) : (
          <EmptyState
            icon="trophy-outline"
            title="Sin metas de ahorro"
            subtitle="Crea una meta para empezar a ahorrar con propósito"
            actionLabel="Crear primera meta"
            onAction={() => navigation.navigate('AddGoal')}
          />
        )}
      </ScrollView>
    </View>
  );
}

function GoalCard({ goal, colors, onPress, onEdit }) {
  const sym = getCurrencySymbol(goal.currency || 'USD');
  const progress = goal.target_amount > 0 ? goal.current_amount / goal.target_amount : 0;
  const pct = Math.round(Math.min(progress, 1) * 100);
  const days = daysUntil(goal.deadline);
  const monthly = calculateMonthlySavingsNeeded(goal.target_amount, goal.current_amount, goal.deadline);
  const isComplete = progress >= 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: isComplete ? colors.primary : colors.border }]}
    >
      <View style={styles.goalCardHeader}>
        <View style={[styles.goalCardIcon, { backgroundColor: goal.color + '20' }]}>
          <Ionicons name={goal.icon || 'star'} size={24} color={goal.color} />
        </View>
        <View style={styles.goalCardInfo}>
          <Text style={[styles.goalCardName, { color: colors.text }]}>{goal.name}</Text>
          {isComplete ? (
            <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark" size={12} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>¡Completada!</Text>
            </View>
          ) : days !== null ? (
            <Text style={[styles.goalCardDue, { color: days < 30 ? colors.warning : colors.textSecondary }]}>
              {days > 0 ? `${days} días restantes` : 'Vencida'}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ProgressBar progress={progress} color={goal.color} showPercent height={8} />

      <View style={styles.goalCardFooter}>
        <View>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Ahorrado</Text>
          <Text style={[styles.footerVal, { color: colors.text }]}>{formatCurrency(goal.current_amount, sym)}</Text>
        </View>
        <View style={styles.footerCenter}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Falta</Text>
          <Text style={[styles.footerVal, { color: colors.danger }]}>
            {formatCurrency(Math.max(0, goal.target_amount - goal.current_amount), sym)}
          </Text>
        </View>
        <View style={styles.footerRight}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Por mes</Text>
          <Text style={[styles.footerVal, { color: goal.color }]}>{formatCurrency(monthly, sym)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: Spacing.xxl },
  summary: {
    padding: Spacing.xl,
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm },
  summaryValue: { color: '#fff', fontSize: 36, fontWeight: FontWeight.bold, marginTop: Spacing.xs },
  summaryTarget: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, marginTop: Spacing.xs },
  efCard: {
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  efHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  efIcon: { width: 44, height: 44, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  efInfo: { flex: 1 },
  efTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  efSub: { fontSize: FontSize.sm, marginTop: 2 },
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  goalsTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  addBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  goalCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  goalCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.md },
  goalCardIcon: { width: 48, height: 48, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  goalCardInfo: { flex: 1 },
  goalCardName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  goalCardDue: { fontSize: FontSize.xs, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginTop: 4 },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  editBtn: { padding: Spacing.xs },
  goalCardFooter: { flexDirection: 'row', marginTop: Spacing.md, paddingTop: Spacing.md },
  footerCenter: { flex: 1, alignItems: 'center' },
  footerRight: { flex: 1, alignItems: 'flex-end' },
  footerLabel: { fontSize: FontSize.xs },
  footerVal: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginTop: 2 },
});
