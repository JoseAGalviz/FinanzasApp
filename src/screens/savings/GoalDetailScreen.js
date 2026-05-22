import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useSavings } from '../../hooks/useSavings';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, daysUntil } from '../../utils/formatDate';
import { calculateMonthlySavingsNeeded } from '../../utils/calculations';
import { ProgressBar } from '../../components/ProgressBar';
import { Modal, ConfirmModal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { AmountInput, Input } from '../../components/Input';
import { DatePicker } from '../../components/DatePicker';
import { todayISO } from '../../utils/formatDate';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '../../constants/theme';

export default function GoalDetailScreen({ route, navigation }) {
  const { goalId } = route.params;
  const { colors, currencySymbol } = useApp();
  const { getGoalWithProgress, getContributions, addContribution, deleteContribution } = useSavings();

  const [goal, setGoal] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addNote, setAddNote] = useState('');
  const [addDate, setAddDate] = useState(todayISO());
  const [addLoading, setAddLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [g, cs] = await Promise.all([getGoalWithProgress(goalId), getContributions(goalId)]);
    setGoal(g);
    setContributions(cs);
    if (g) navigation.setOptions({ title: g.name });
  }, [goalId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  async function handleAddContribution() {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    setAddLoading(true);
    try {
      await addContribution(goalId, addAmount, addNote, addDate);
      setShowAdd(false);
      setAddAmount('');
      setAddNote('');
      loadData();
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDeleteContribution(c) {
    await deleteContribution(c.id, goalId, c.amount);
    setConfirmDelete(null);
    loadData();
  }

  if (!goal) return null;

  const days = daysUntil(goal.deadline);
  const monthly = calculateMonthlySavingsNeeded(goal.target_amount, goal.current_amount, goal.deadline);
  const isComplete = goal.current_amount >= goal.target_amount;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: goal.color }]}>
          <Ionicons name={goal.icon || 'star'} size={56} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroName}>{goal.name}</Text>
          <Text style={styles.heroAmount}>{formatCurrency(goal.current_amount, currencySymbol)}</Text>
          <Text style={styles.heroTarget}>de {formatCurrency(goal.target_amount, currencySymbol)}</Text>
          <View style={[styles.heroProgress, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <View style={[styles.heroFill, { width: `${Math.round(goal.progress * 100)}%`, backgroundColor: '#fff' }]} />
          </View>
          <Text style={styles.heroPct}>{Math.round(goal.progress * 100)}% completado</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox label="Falta" value={formatCurrency(Math.max(0, goal.target_amount - goal.current_amount), currencySymbol)} color={colors.danger} colors={colors} />
          <StatBox label="Por mes" value={formatCurrency(monthly, currencySymbol)} color={goal.color} colors={colors} />
          {days !== null && <StatBox label="Días" value={String(days)} color={days < 30 ? colors.warning : colors.text} colors={colors} />}
        </View>

        {isComplete && (
          <View style={[styles.completeBanner, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            <Text style={[styles.completeText, { color: colors.primary }]}>¡Meta completada! ¡Felicitaciones!</Text>
          </View>
        )}

        {/* Contributions */}
        <View style={styles.contribHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contribuciones</Text>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            style={[styles.addBtn, { backgroundColor: goal.color + '20' }]}
          >
            <Ionicons name="add" size={18} color={goal.color} />
            <Text style={[styles.addBtnText, { color: goal.color }]}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {contributions.length === 0 ? (
          <Text style={[styles.emptyNote, { color: colors.textSecondary }]}>Sin contribuciones aún. ¡Agrega tu primer aporte!</Text>
        ) : (
          contributions.map(c => (
            <TouchableOpacity
              key={c.id}
              onLongPress={() => setConfirmDelete(c)}
              style={[styles.contribItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.contribIcon, { backgroundColor: goal.color + '20' }]}>
                <Ionicons name="add-circle" size={20} color={goal.color} />
              </View>
              <View style={styles.contribInfo}>
                <Text style={[styles.contribNote, { color: colors.text }]}>{c.note || 'Contribución'}</Text>
                <Text style={[styles.contribDate, { color: colors.textSecondary }]}>{formatDate(c.date)}</Text>
              </View>
              <Text style={[styles.contribAmount, { color: goal.color }]}>+{formatCurrency(c.amount, currencySymbol)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Contribution Modal */}
      <Modal visible={showAdd} onClose={() => setShowAdd(false)} title="Agregar Contribución">
        <AmountInput value={addAmount} onChangeText={setAddAmount} label="Monto a aportar" />
        <Input label="Nota (opcional)" value={addNote} onChangeText={setAddNote} placeholder="Ej: Ahorro mensual" />
        <DatePicker label="Fecha" value={addDate} onChange={setAddDate} />
        <Button title="Guardar" onPress={handleAddContribution} loading={addLoading} />
      </Modal>

      <ConfirmModal
        visible={!!confirmDelete}
        title="Eliminar contribución"
        message={`Esto reducirá el total ahorrado en ${confirmDelete ? formatCurrency(confirmDelete.amount, currencySymbol) : ''}. ¿Continuar?`}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDeleteContribution(confirmDelete)}
      />
    </View>
  );
}

function StatBox({ label, value, color, colors }) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: Spacing.xxl },
  hero: {
    padding: Spacing.xxl,
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  heroName: { color: '#fff', fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: Spacing.md },
  heroAmount: { color: '#fff', fontSize: 36, fontWeight: FontWeight.bold, marginTop: Spacing.sm },
  heroTarget: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.md },
  heroProgress: { width: '80%', height: 8, borderRadius: 4, marginTop: Spacing.md, overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: 4 },
  heroPct: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm, marginTop: Spacing.sm },
  statsRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  statBox: { flex: 1, alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, ...Shadow.sm },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  completeBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md },
  completeText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  contribHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  addBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  emptyNote: { textAlign: 'center', fontSize: FontSize.sm, padding: Spacing.xl },
  contribItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  contribIcon: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  contribInfo: { flex: 1 },
  contribNote: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  contribDate: { fontSize: FontSize.xs, marginTop: 2 },
  contribAmount: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
