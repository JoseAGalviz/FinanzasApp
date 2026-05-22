import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../constants/theme';

export function ProgressBar({ progress, color, height = 8, showPercent = false, label, style }) {
  const { colors } = useApp();
  const clamped = Math.min(Math.max(parseFloat(progress) || 0, 0), 1);
  const pct = Math.round(clamped * 100);

  let barColor = color;
  if (!barColor) {
    if (pct < 70) barColor = colors.primary;
    else if (pct < 90) barColor = colors.warning;
    else barColor = colors.danger;
  }

  return (
    <View style={[styles.wrapper, style]}>
      {(label || showPercent) && (
        <View style={styles.header}>
          {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
          {showPercent && <Text style={[styles.pct, { color: barColor }]}>{pct}%</Text>}
        </View>
      )}
      <View style={[styles.track, { backgroundColor: colors.border, height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: barColor,
              height,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function ProgressBarLabeled({ spent, limit, label, currencySymbol = '$' }) {
  const { colors } = useApp();
  const progress = limit > 0 ? spent / limit : 0;
  const clamped = Math.min(progress, 1);
  const pct = Math.round(clamped * 100);

  let barColor = colors.primary;
  if (pct >= 70 && pct < 90) barColor = colors.warning;
  if (pct >= 90) barColor = colors.danger;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.amounts, { color: colors.textSecondary }]}>
          {currencySymbol}{spent.toFixed(0)} / {currencySymbol}{limit.toFixed(0)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border, height: 6, borderRadius: 3 }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor, height: 6, borderRadius: 3 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  pct: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  amounts: { fontSize: FontSize.xs },
  track: { overflow: 'hidden' },
  fill: { minWidth: 2 },
});
