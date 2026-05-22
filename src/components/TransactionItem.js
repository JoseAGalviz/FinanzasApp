import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { getCategoryById } from '../constants/categories';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateShort } from '../utils/formatDate';
import { BorderRadius, FontSize, FontWeight, Spacing, getCurrencySymbol } from '../constants/theme';

export function TransactionItem({ transaction, onPress, onLongPress }) {
  const { colors } = useApp();
  const isIncome = transaction.type === 'income';
  const cat = getCategoryById(transaction.category, transaction.type);
  const amountColor = isIncome ? colors.primary : colors.danger;
  const symbol = getCurrencySymbol(transaction.currency || 'USD');

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={[styles.item, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}
    >
      <View style={[styles.icon, { backgroundColor: cat.color + '22' }]}>
        <Ionicons name={cat.icon} size={20} color={cat.color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.category, { color: colors.text }]} numberOfLines={1}>
          {cat.name}
        </Text>
        {transaction.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
            {transaction.description}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {formatDateShort(transaction.date)}
          {transaction.is_recurring ? '  ↻' : ''}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, symbol)}
      </Text>
    </TouchableOpacity>
  );
}

export function TransactionGroup({ date, transactions, onItemPress }) {
  const { colors } = useApp();
  return (
    <View>
      <Text style={[styles.groupDate, { color: colors.textSecondary, backgroundColor: colors.background }]}>
        {date}
      </Text>
      {transactions.map(t => (
        <TransactionItem key={t.id} transaction={t} onPress={() => onItemPress?.(t)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  info: { flex: 1 },
  category: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  description: { fontSize: FontSize.sm, marginTop: 1 },
  date: { fontSize: FontSize.xs, marginTop: 2 },
  amount: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  groupDate: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
