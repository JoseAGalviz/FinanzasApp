import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { BorderRadius, Shadow, Spacing } from '../constants/theme';

export function Card({ children, style, padding = Spacing.md }) {
  const { colors } = useApp();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding }, Shadow.sm, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
});
