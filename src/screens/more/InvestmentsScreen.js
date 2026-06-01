import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useInvestments } from '../../hooks/useInvestments';
import { formatCurrency, formatPercent } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { INVESTMENT_TYPES } from '../../constants/categories';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmModal } from '../../components/Modal';
import { BorderRadius, FontSize, FontWeight, Spacing, getCurrencySymbol } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function InvestmentsScreen({ navigation }) {
  const { colors, currencySymbol } = useApp();
  const { investments, loading, fetchInvestments, deleteInvestment, getPortfolioSummary, getPieData } = useInvestments();
  const [summary, setSummary] = useState(null);
  const [pieData, setPieData] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await fetchInvestments();
    const [s, p] = await Promise.all([getPortfolioSummary(), getPieData()]);
    setSummary(s);
    setPieData(p);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadData(); setRefreshing(false); }, [loadData]);

  async function handleDelete(inv) {
    await deleteInvestment(inv.id);
    setConfirmDelete(null);
    loadData();
  }

  const isPositive = (summary?.gain || 0) >= 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Summary card */}
        {summary && summary.count > 0 && (
          <View style={[styles.hero, { backgroundColor: isPositive ? colors.primary : colors.danger }]}>
            <Text style={styles.heroLabel}>Valor total del portafolio</Text>
            <Text style={styles.heroValue}>{formatCurrency(summary.totalValue, currencySymbol)}</Text>
            <View style={styles.heroRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Invertido</Text>
                <Text style={styles.heroStatValue}>{formatCurrency(summary.totalInvested, currencySymbol)}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Ganancia/Pérdida</Text>
                <Text style={styles.heroStatValue}>{isPositive ? '+' : ''}{formatCurrency(summary.gain, currencySymbol)} ({formatPercent(summary.gainPct)})</Text>
              </View>
            </View>
          </View>
        )}

        {/* Pie chart */}
        {pieData.length > 1 && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Distribución del Portafolio</Text>
            <View style={styles.pieRow}>
              <PieChart
                data={pieData}
                donut
                innerRadius={55}
                radius={85}
                isAnimated
                showText={false}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.pieCenter, { color: colors.text }]}>{summary?.count}</Text>
                    <Text style={[styles.pieCenterSub, { color: colors.textSecondary }]}>activos</Text>
                  </View>
                )}
              />
              <View style={styles.pieLegend}>
                {pieData.map(d => (
                  <View key={d.label} style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: d.color }]} />
                    <View>
                      <Text style={[styles.legendLabel, { color: colors.text }]}>{d.label}</Text>
                      <Text style={[styles.legendVal, { color: colors.textSecondary }]}>{formatCurrency(d.value, currencySymbol)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        )}

        {/* Investment list */}
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.text }]}>Mis Inversiones</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddInvestment')}
            style={[styles.addBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {investments.length === 0 ? (
          <EmptyState
            icon="trending-up-outline"
            title="Sin inversiones"
            subtitle="Registra tus activos para ver el rendimiento de tu portafolio"
            actionLabel="Agregar inversión"
            onAction={() => navigation.navigate('AddInvestment')}
          />
        ) : (
          investments.map(inv => {
            const invSym = getCurrencySymbol(inv.currency || 'USD');
            const gain = inv.current_value - inv.invested_amount;
            const gainPct = inv.invested_amount > 0 ? (gain / inv.invested_amount) * 100 : 0;
            const isPos = gain >= 0;
            const type = INVESTMENT_TYPES.find(t => t.id === inv.type) || { name: inv.type, color: '#6B7280', icon: 'cash' };
            return (
              <TouchableOpacity
                key={inv.id}
                onPress={() => navigation.navigate('AddInvestment', { investment: inv })}
                onLongPress={() => setConfirmDelete(inv)}
                style={[styles.invCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.invHeader}>
                  <View style={[styles.invIcon, { backgroundColor: type.color + '20' }]}>
                    <Ionicons name={type.icon} size={20} color={type.color} />
                  </View>
                  <View style={styles.invInfo}>
                    <Text style={[styles.invName, { color: colors.text }]}>{inv.name}</Text>
                    <Text style={[styles.invType, { color: colors.textSecondary }]}>{type.name} · {formatDate(inv.purchase_date)}</Text>
                  </View>
                  <View style={styles.invRight}>
                    <Text style={[styles.invValue, { color: colors.text }]}>{formatCurrency(inv.current_value, invSym)}</Text>
                    <View style={styles.gainRow}>
                      <Ionicons name={isPos ? 'trending-up' : 'trending-down'} size={12} color={isPos ? colors.primary : colors.danger} />
                      <Text style={[styles.gainText, { color: isPos ? colors.primary : colors.danger }]}>
                        {isPos ? '+' : ''}{formatPercent(gainPct)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.invFooter, { borderTopColor: colors.divider }]}>
                  <Text style={[styles.invFooterText, { color: colors.textSecondary }]}>Invertido: {formatCurrency(inv.invested_amount, invSym)}</Text>
                  <Text style={[styles.invFooterText, { color: isPos ? colors.primary : colors.danger }]}>
                    {isPos ? '+' : ''}{formatCurrency(gain, invSym)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!confirmDelete}
        title="Eliminar inversión"
        message={`¿Eliminar "${confirmDelete?.name}"?`}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: Spacing.xxl },
  hero: { padding: Spacing.xl, paddingTop: 48, alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm },
  heroValue: { color: '#fff', fontSize: 32, fontWeight: FontWeight.bold, marginTop: Spacing.xs },
  heroRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.md },
  heroStat: { alignItems: 'center' },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
  heroStatValue: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginTop: 2 },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pieLegend: { flex: 1, gap: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  legendVal: { fontSize: FontSize.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pieCenter: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  pieCenterSub: { fontSize: FontSize.xs },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  listTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  addBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  invCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  invHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  invIcon: { width: 44, height: 44, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  invInfo: { flex: 1 },
  invName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  invType: { fontSize: FontSize.xs, marginTop: 2 },
  invRight: { alignItems: 'flex-end' },
  invValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  gainRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  gainText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  invFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.sm, paddingHorizontal: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  invFooterText: { fontSize: FontSize.xs },
});
