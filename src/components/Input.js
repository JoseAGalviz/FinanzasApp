import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';

export function Input({
  label, value, onChangeText, placeholder, keyboardType = 'default',
  secureTextEntry, multiline, numberOfLines, editable = true,
  error, prefix, suffix, onSuffixPress, style, inputStyle,
  maxLength, autoCapitalize = 'sentences',
}) {
  const { colors } = useApp();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.danger
    : focused
    ? colors.inputBorderFocused
    : colors.inputBorder;

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={[styles.container, { backgroundColor: colors.inputBackground, borderColor }]}>
        {prefix && <Text style={[styles.prefix, { color: colors.textSecondary }]}>{prefix}</Text>}
        <TextInput
          style={[styles.input, { color: colors.text }, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {suffix && (
          <TouchableOpacity onPress={onSuffixPress} disabled={!onSuffixPress}>
            {typeof suffix === 'string' ? (
              <Ionicons name={suffix} size={20} color={colors.textSecondary} />
            ) : (
              suffix
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
}

export function AmountInput({ value, onChangeText, label, style }) {
  const { colors, currencySymbol } = useApp();
  return (
    <Input
      label={label || 'Monto'}
      value={value}
      onChangeText={onChangeText}
      keyboardType="decimal-pad"
      prefix={currencySymbol}
      placeholder="0.00"
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  prefix: {
    fontSize: FontSize.md,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  error: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});
