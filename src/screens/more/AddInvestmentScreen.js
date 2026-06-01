import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useInvestments } from '../../hooks/useInvestments';
import { Input, AmountInput } from '../../components/Input';
import { DatePicker } from '../../components/DatePicker';
import { Button } from '../../components/Button';
import { formatCurrency, formatPercent } from '../../utils/formatCurrency';
import { INVESTMENT_TYPES } from '../../constants/categories';
import { todayISO } from '../../utils/formatDate';
import { BorderRadius, FontSize, FontWeight, Spacing, getCurrencySymbol } from '../../constants/theme';
import { CurrencyPicker } from '../../components/CurrencyPicker';

export default function AddInvestmentScreen({ route, navigation }) {
  const existing = route.params?.investment;
  const { colors, currencyCode } = useApp();
  const { addInvestment, updateInvestment, deleteInvestment } = useInvestments();

  const [name, setName] = useState(existing?.name || '');
  const [type, setType] = useState(existing?.type || 'etf');
  const [investedAmount, setInvestedAmount] = useState(existing ? String(existing.invested_amount) : '');
  const [currentValue, setCurrentValue] = useState(existing ? String(existing.current_value) : '');
  const [purchaseDate, setPurchaseDate] = useState(existing?.purchase_date || todayISO());
  const [notes, setNotes] = useState(existing?.notes || '');
  const [currency, setCurrency] = useState(existing?.currency || currencyCode || 'USD');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Ingresa un nombre';
    if (!investedAmount || parseFloat(investedAmount) <= 0) e.investedAmount = 'Ingresa monto invertido';
    if (!currentValue || parseFloat(currentValue) <= 0) e.currentValue = 'Ingresa valor actual';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = { name: name.trim(), type, invested_amount: parseFloat(investedAmount), current_value: parseFloat(currentValue), purchase_date: purchaseDate, notes, currency };
      if (existing) { await updateInvestment(existing.id, data); }
      else { await addInvestment(data); }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    Alert.alert('Eliminar', '¿Eliminar esta inversión?', [
      { text: 'Cancelar' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteInvestment(existing.id); navigation.goBack(); } },
    ]);
  }

  const gain = (parseFloat(currentValue) || 0) - (parseFloat(investedAmount) || 0);
  const gainPct = (parseFloat(investedAmount) || 0) > 0 ? (gain / parseFloat(investedAmount)) * 100 : 0;

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Input label="Nombre del activo" value={name} onChangeText={setName} placeholder="Ej: S&P 500 ETF, Bitcoin..." error={errors.name} />
      <CurrencyPicker label="Moneda" value={currency} onChange={setCurrency} colors={colors} />

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Tipo de inversión</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll} contentContainerStyle={styles.typeRow}>
        {INVESTMENT_TYPES.map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setType(t.id)}
            style={[styles.typeBtn, { backgroundColor: type === t.id ? t.color + '20' : colors.surfaceAlt, borderColor: type === t.id ? t.color : colors.border }]}
          >
            <Ionicons name={t.icon} size={20} color={type === t.id ? t.color : colors.textSecondary} />
            <Text style={[styles.typeBtnText, { color: type === t.id ? t.color : colors.textSecondary }]}>{t.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <AmountInput label="Monto invertido" value={investedAmount} onChangeText={setInvestedAmount} />
      {errors.investedAmount && <Text style={[styles.error, { color: colors.danger }]}>{errors.investedAmount}</Text>}
      <AmountInput label="Valor actual" value={currentValue} onChangeText={setCurrentValue} />
      {errors.currentValue && <Text style={[styles.error, { color: colors.danger }]}>{errors.currentValue}</Text>}

      <DatePicker label="Fecha de compra" value={purchaseDate} onChange={setPurchaseDate} />
      <Input label="Notas (opcional)" value={notes} onChangeText={setNotes} placeholder="Observaciones..." multiline numberOfLines={2} />

      {/* Preview */}
      {investedAmount && currentValue && (
        <View style={[styles.preview, { backgroundColor: gain >= 0 ? colors.successLight : colors.dangerLight }]}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Rendimiento actual:</Text>
          <Text style={[styles.previewValue, { color: gain >= 0 ? colors.primary : colors.danger }]}>
            {gain >= 0 ? '+' : ''}{formatCurrency(gain, getCurrencySymbol(currency))} ({gain >= 0 ? '+' : ''}{formatPercent(gainPct)})
          </Text>
        </View>
      )}

      <Button title={existing ? 'Guardar cambios' : 'Agregar inversión'} onPress={handleSave} loading={loading} style={styles.saveBtn} />
      {existing && <Button title="Eliminar" variant="danger" onPress={handleDelete} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  typeScroll: { maxHeight: 60, marginBottom: Spacing.md },
  typeRow: { gap: Spacing.sm },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  typeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  preview: { padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { fontSize: FontSize.sm },
  previewValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  saveBtn: { marginBottom: Spacing.sm },
  error: { fontSize: FontSize.xs, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
});
