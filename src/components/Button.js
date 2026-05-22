import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../constants/theme';

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, textStyle, icon, size = 'md' }) {
  const { colors } = useApp();

  const variants = {
    primary: { bg: colors.primary, text: '#FFFFFF', border: colors.primary },
    secondary: { bg: colors.surface, text: colors.text, border: colors.border },
    danger: { bg: colors.danger, text: '#FFFFFF', border: colors.danger },
    ghost: { bg: 'transparent', text: colors.primary, border: 'transparent' },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
  };

  const sizes = {
    sm: { padding: Spacing.sm, fontSize: FontSize.sm },
    md: { padding: Spacing.md, fontSize: FontSize.md },
    lg: { padding: Spacing.lg, fontSize: FontSize.lg },
  };

  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.btn,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: s.padding,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
});
