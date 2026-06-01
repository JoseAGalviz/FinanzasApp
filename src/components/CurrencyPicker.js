import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CURRENCY_SYMBOLS, BorderRadius, FontSize, FontWeight, Spacing } from '../constants/theme';

export function CurrencyPicker({ value, onChange, colors, label }) {
  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={styles.row}>
        {CURRENCY_SYMBOLS.map(c => (
          <TouchableOpacity
            key={c.code}
            onPress={() => onChange(c.code)}
            style={[
              styles.chip,
              {
                backgroundColor: value === c.code ? colors.primary + '20' : colors.surfaceAlt,
                borderColor: value === c.code ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.symbol, { color: value === c.code ? colors.primary : colors.textSecondary }]}>
              {c.symbol}
            </Text>
            <Text style={[styles.code, { color: value === c.code ? colors.primary : colors.textSecondary }]}>
              {c.code}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  symbol: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  code: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
});
