import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useBills } from '../../hooks/useBills';
import { formatCurrency } from '../../utils/formatCurrency';
import { todayISO } from '../../utils/formatDate';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '../../constants/theme';
import { CURRENCY_SYMBOLS } from '../../constants/theme';

function dueDayLabel(day) {
  if (day === 0) return 'Último día del mes';
  return `Día ${day} de cada mes`;
}

function getStatusColor(bill, colors) {
  if (bill.isPaidThisMonth) return colors.primary;
  if (bill.isOverdue) return colors.danger;
  if (bill.isDueSoon) return colors.warning;
  return colors.textSecondary;
}

function getStatusText(bill) {
  if (bill.isPaidThisMonth) return 'Pagado este mes';
  if (bill.isOverdue) return `Venció hace ${Math.abs(bill.daysUntilDue)} día(s)`;
  if (bill.daysUntilDue === 0) return '¡Vence hoy!';
  if (bill.isDueSoon) return `Vence en ${bill.daysUntilDue} día(s)`;
  return `Vence en ${bill.daysUntilDue} día(s)`;
}

function getCurrencySymbol(code) {
  return CURRENCY_SYMBOLS.find(c => c.code === code)?.symbol ?? code;
}

export default function BillsScreen({ navigation }) {
  const { colors } = useApp();
  const { loading, markAsPaid, deleteBill, getBillsWithStatus } = useBills();
  const [billsWithStatus, setBillsWithStatus] = useState([]);
  const [filter, setFilter] = useState('all');

  const loadData = useCallback(async () => {
    const data = await getBillsWithStatus();
    setBillsWithStatus(data);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const filtered = billsWithStatus.filter(b => {
    if (filter === 'pending') return !b.isPaidThisMonth;
    if (filter === 'paid') return b.isPaidThisMonth;
    return true;
  });

  const totalPending = billsWithStatus
    .filter(b => !b.isPaidThisMonth)
    .reduce((s, b) => s + (b.amount || 0), 0);

  async function handleMarkPaid(bill) {
    Alert.alert(
      `Marcar como pagado`,
      `¿Confirmas el pago de "${bill.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            await markAsPaid(bill.id, bill.amount, bill.currency, todayISO());
            loadData();
          },
        },
      ]
    );
  }

  async function handleDelete(bill) {
    Alert.alert(
      'Eliminar responsabilidad',
      `¿Eliminar "${bill.name}"? Se borrarán también sus pagos registrados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteBill(bill.id);
            loadData();
          },
        },
      ]
    );
  }

  function renderBill({ item: bill }) {
    const statusColor = getStatusColor(bill, colors);
    const statusText = getStatusText(bill);
    const sym = getCurrencySymbol(bill.currency);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('AddBill', { bill })}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: bill.color + '20' }]}>
          <Ionicons name={bill.icon || 'receipt'} size={22} color={bill.color} />
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={[styles.billName, { color: colors.text }]} numberOfLines={1}>{bill.name}</Text>
            <Text style={[styles.billAmount, { color: colors.text }]}>
              {sym}{bill.amount.toLocaleString('es-VE', { minimumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.dueDay, { color: colors.textSecondary }]}>{dueDayLabel(bill.due_day)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {!bill.isPaidThisMonth && (
            <TouchableOpacity
              onPress={() => handleMarkPaid(bill)}
              style={[styles.payBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDelete(bill)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Summary */}
      <View style={[styles.summary, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Responsabilidades</Text>
          <Text style={[styles.summaryVal, { color: colors.text }]}>{billsWithStatus.length}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pendientes</Text>
          <Text style={[styles.summaryVal, { color: colors.danger }]}>
            {billsWithStatus.filter(b => !b.isPaidThisMonth).length}
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pagadas</Text>
          <Text style={[styles.summaryVal, { color: colors.primary }]}>
            {billsWithStatus.filter(b => b.isPaidThisMonth).length}
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {[
          { key: 'all', label: 'Todas' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'paid', label: 'Pagadas' },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.pill, { backgroundColor: filter === f.key ? colors.primary : colors.surfaceAlt, borderColor: filter === f.key ? colors.primary : colors.border }]}
          >
            <Text style={[styles.pillText, { color: filter === f.key ? '#fff' : colors.textSecondary }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderBill}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin responsabilidades</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Agrega tus pagos fijos: arriendo, servicios, suscripciones
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddBill')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  summary: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: FontSize.xs, marginBottom: 2 },
  summaryVal: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  summaryDivider: { width: 1 },
  filterScroll: { maxHeight: 48 },
  filterRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs, alignItems: 'center' },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  list: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, flex: 1 },
  billAmount: { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginLeft: Spacing.sm },
  dueDay: { fontSize: FontSize.xs },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  statusText: { fontSize: 10, fontWeight: FontWeight.semibold },
  actions: { flexDirection: 'column', gap: Spacing.xs, alignItems: 'center' },
  payBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, textAlign: 'center' },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
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
