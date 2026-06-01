import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useDebts } from '../../hooks/useDebts';
import { formatCurrency, formatPercent } from '../../utils/formatCurrency';
import { formatDate, daysUntil } from '../../utils/formatDate';
import { calculateDebtPayoff } from '../../utils/calculations';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { AmountInput, Input } from '../../components/Input';
import { ConfirmModal } from '../../components/Modal';
import { todayISO } from '../../utils/formatDate';
import { BorderRadius, FontSize, FontWeight, Spacing, getCurrencySymbol } from '../../constants/theme';

export default function DebtsScreen({ navigation }) {
  const { colors, currencySymbol } = useApp();
  const { debts, loading, fetchDebts, deleteDebt, addPayment, getStrategies } = useDebts();
  const [strategies, setStrategies] = useState(null);
  const [showPayment, setShowPayment] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payDate, setPayDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  const loadData = useCallback(async () => {
    await fetchDebts();
    const s = await getStrategies(0);
    setStrategies(s);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  const onRefresh = useCallback(async () => { setRefreshing(true); await loadData(); setRefreshing(false); }, [loadData]);

  async function handlePayment() {
    if (!payAmount || parseFloat(payAmount) <= 0) return;
    setSaving(true);
    try {
      await addPayment(showPayment.id, payAmount, payDate, payNote);
      setShowPayment(null);
      setPayAmount('');
      setPayNote('');
      loadData();
    } finally {
      setSaving(false);
    }
  }

  const totalDebt = debts.reduce((s, d) => s + parseFloat(d.remaining_amount || 0), 0);
  const monthlyMin = debts.reduce((s, d) => s + parseFloat(d.minimum_payment || 0), 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[['list', 'Mis Deudas'], ['strategy', 'Estrategia']].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setActiveTab(k)} style={[styles.tab, activeTab === k && { borderBottomColor: colors.primary }]}>
            <Text style={[styles.tabText, { color: activeTab === k ? colors.primary : colors.textSecondary }]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {activeTab === 'list' && (
          <>
            {/* Summary */}
            {debts.length > 0 && (
              <View style={[styles.summaryCard, { backgroundColor: colors.danger }]}>
                <Text style={styles.sumLabel}>Deuda Total</Text>
                <Text style={styles.sumValue}>{formatCurrency(totalDebt, currencySymbol)}</Text>
                <Text style={styles.sumSub}>Pago mínimo mensual: {formatCurrency(monthlyMin, currencySymbol)}</Text>
              </View>
            )}

            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Deudas</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AddDebt')} style={[styles.addBtn, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="add" size={18} color={colors.danger} />
                <Text style={[styles.addBtnText, { color: colors.danger }]}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {debts.length === 0 ? (
              <EmptyState icon="card-outline" title="Sin deudas" subtitle="Registra tus deudas para planificar tu estrategia de pago" actionLabel="Agregar deuda" onAction={() => navigation.navigate('AddDebt')} />
            ) : (
              debts.map(debt => {
                const debtSym = getCurrencySymbol(debt.currency || 'USD');
                const progress = debt.total_amount > 0 ? 1 - debt.remaining_amount / debt.total_amount : 0;
                const days = daysUntil(debt.due_date);
                const isOverdue = days !== null && days < 0;
                return (
                  <TouchableOpacity
                    key={debt.id}
                    onPress={() => navigation.navigate('AddDebt', { debt })}
                    onLongPress={() => setConfirmDelete(debt)}
                    style={[styles.debtCard, { backgroundColor: colors.surface, borderColor: isOverdue ? colors.danger : colors.border }]}
                  >
                    <View style={styles.debtHeader}>
                      <View style={styles.debtInfo}>
                        <Text style={[styles.debtName, { color: colors.text }]}>{debt.name}</Text>
                        <Text style={[styles.debtRate, { color: colors.textSecondary }]}>{debt.interest_rate}% TAE · Min: {formatCurrency(debt.minimum_payment, debtSym)}</Text>
                      </View>
                      <View style={styles.debtRight}>
                        <Text style={[styles.debtAmount, { color: colors.danger }]}>{formatCurrency(debt.remaining_amount, debtSym)}</Text>
                        {debt.due_date && (
                          <Text style={[styles.debtDue, { color: isOverdue ? colors.danger : colors.textTertiary }]}>
                            {isOverdue ? 'Vencida' : `Vence en ${days}d`}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={[styles.debtTrack, { backgroundColor: colors.border }]}>
                      <View style={[styles.debtFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={[styles.debtProgress, { color: colors.textSecondary }]}>
                      {formatPercent(progress * 100)} pagado · {formatCurrency(debt.total_amount, debtSym)} total
                    </Text>

                    <TouchableOpacity
                      onPress={() => { setShowPayment(debt); setPayAmount(''); }}
                      style={[styles.payBtn, { backgroundColor: colors.primaryLight }]}
                    >
                      <Ionicons name="cash" size={16} color={colors.primary} />
                      <Text style={[styles.payBtnText, { color: colors.primary }]}>Registrar pago</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {activeTab === 'strategy' && strategies && debts.length > 0 && (
          <>
            <Card>
              <Text style={[styles.stratTitle, { color: colors.text }]}>Comparativa de Estrategias</Text>
              <Text style={[styles.stratSub, { color: colors.textSecondary }]}>Con los pagos mínimos actuales</Text>

              <View style={styles.stratRow}>
                <StratCard title="Avalancha" subtitle="Mayor interés primero" months={strategies.avalanche.months} interest={strategies.avalanche.totalInterest} color={colors.info} colors={colors} currencySymbol={currencySymbol} />
                <StratCard title="Bola de Nieve" subtitle="Menor saldo primero" months={strategies.snowball.months} interest={strategies.snowball.totalInterest} color={colors.warning} colors={colors} currencySymbol={currencySymbol} />
              </View>

              <View style={[styles.stratNote, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="information-circle" size={16} color={colors.info} />
                <Text style={[styles.stratNoteText, { color: colors.info }]}>
                  La avalancha ahorra más en intereses. La bola de nieve es más motivadora.
                </Text>
              </View>
            </Card>

            {debts.map(debt => {
              const debtSym = getCurrencySymbol(debt.currency || 'USD');
              const monthsLeft = debt.interest_rate > 0 && debt.minimum_payment > 0
                ? Math.ceil(debt.remaining_amount / debt.minimum_payment)
                : null;
              return (
                <Card key={debt.id}>
                  <Text style={[styles.debtCardTitle, { color: colors.text }]}>{debt.name}</Text>
                  <View style={styles.debtStatRow}>
                    <StatBox label="Saldo" value={formatCurrency(debt.remaining_amount, debtSym)} colors={colors} />
                    <StatBox label="Interés" value={`${debt.interest_rate}%`} colors={colors} />
                    <StatBox label="Mín/mes" value={formatCurrency(debt.minimum_payment, debtSym)} colors={colors} />
                  </View>
                  {debt.due_date && <Text style={[styles.debtDueText, { color: colors.textSecondary }]}>Próximo pago: {formatDate(debt.due_date)}</Text>}
                </Card>
              );
            })}
          </>
        )}

        {activeTab === 'strategy' && debts.length === 0 && (
          <EmptyState icon="card-outline" title="Sin deudas" subtitle="Agrega deudas para ver estrategias de pago" />
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={!!showPayment} onClose={() => setShowPayment(null)} title={`Pago: ${showPayment?.name}`}>
        <AmountInput label="Monto del pago" value={payAmount} onChangeText={setPayAmount} />
        <Input label="Fecha" value={payDate} onChangeText={setPayDate} placeholder="YYYY-MM-DD" />
        <Input label="Nota (opcional)" value={payNote} onChangeText={setPayNote} placeholder="Ej: Pago mensual" />
        <Button title="Registrar pago" onPress={handlePayment} loading={saving} />
      </Modal>

      <ConfirmModal
        visible={!!confirmDelete}
        title="Eliminar deuda"
        message={`¿Eliminar "${confirmDelete?.name}"?`}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => { await deleteDebt(confirmDelete.id); setConfirmDelete(null); loadData(); }}
      />
    </View>
  );
}

function StratCard({ title, subtitle, months, interest, color, colors, currencySymbol }) {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const timeStr = years > 0 ? `${years}a ${rem}m` : `${months}m`;
  return (
    <View style={[styles.stratCard, { backgroundColor: color + '15', borderColor: color + '40' }]}>
      <Text style={[styles.stratCardTitle, { color }]}>{title}</Text>
      <Text style={[styles.stratCardSub, { color: colors.textSecondary }]}>{subtitle}</Text>
      <Text style={[styles.stratCardTime, { color: colors.text }]}>{timeStr}</Text>
      <Text style={[styles.stratCardInterest, { color: colors.textSecondary }]}>Intereses: {formatCurrency(interest, currencySymbol)}</Text>
    </View>
  );
}

function StatBox({ label, value, colors }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statVal, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  scroll: { paddingBottom: Spacing.xxl },
  summaryCard: { padding: Spacing.xl, alignItems: 'center' },
  sumLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm },
  sumValue: { color: '#fff', fontSize: 32, fontWeight: FontWeight.bold, marginTop: 4 },
  sumSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginTop: 4 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  listTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  addBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  debtCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md },
  debtHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  debtInfo: { flex: 1 },
  debtName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  debtRate: { fontSize: FontSize.xs, marginTop: 2 },
  debtRight: { alignItems: 'flex-end' },
  debtAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  debtDue: { fontSize: FontSize.xs, marginTop: 2 },
  debtTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.xs },
  debtFill: { height: '100%', borderRadius: 3 },
  debtProgress: { fontSize: FontSize.xs, marginBottom: Spacing.sm },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, padding: Spacing.sm, borderRadius: BorderRadius.md },
  payBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  stratTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: 4 },
  stratSub: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  stratRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  stratCard: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  stratCardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  stratCardSub: { fontSize: FontSize.xs, marginTop: 2, marginBottom: Spacing.sm },
  stratCardTime: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  stratCardInterest: { fontSize: FontSize.xs, marginTop: 2 },
  stratNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, padding: Spacing.sm, borderRadius: BorderRadius.sm },
  stratNoteText: { flex: 1, fontSize: FontSize.xs },
  debtCardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
  debtStatRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  statLabel: { fontSize: FontSize.xs },
  debtDueText: { fontSize: FontSize.xs },
});
