import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useSavings } from '../../hooks/useSavings';
import { Input, AmountInput } from '../../components/Input';
import { DatePicker } from '../../components/DatePicker';
import { Button } from '../../components/Button';
import { GOAL_ICONS, GOAL_COLORS } from '../../constants/categories';
import { todayISO } from '../../utils/formatDate';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/theme';
import { CurrencyPicker } from '../../components/CurrencyPicker';

export default function AddGoalScreen({ route, navigation }) {
  const existing = route.params?.goal;
  const { colors, currencyCode } = useApp();
  const { addGoal, updateGoal, deleteGoal } = useSavings();

  const [name, setName] = useState(existing?.name || '');
  const [targetAmount, setTargetAmount] = useState(existing ? String(existing.target_amount) : '');
  const [initialAmount, setInitialAmount] = useState('0');
  const [deadline, setDeadline] = useState(existing?.deadline || '');
  const [icon, setIcon] = useState(existing?.icon || GOAL_ICONS[0]);
  const [color, setColor] = useState(existing?.color || GOAL_COLORS[0]);
  const [currency, setCurrency] = useState(existing?.currency || currencyCode || 'USD');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Ingresa un nombre';
    if (!targetAmount || parseFloat(targetAmount) <= 0) e.targetAmount = 'Ingresa un monto objetivo';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        target_amount: parseFloat(targetAmount),
        current_amount: existing ? existing.current_amount : parseFloat(initialAmount) || 0,
        deadline: deadline || null,
        icon,
        color,
        currency,
      };
      if (existing) {
        await updateGoal(existing.id, data);
      } else {
        await addGoal(data);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    Alert.alert('Eliminar meta', '¿Seguro? Se eliminará todo el historial de contribuciones.', [
      { text: 'Cancelar' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await deleteGoal(existing.id);
        navigation.goBack();
      }},
    ]);
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Input label="Nombre de la meta" value={name} onChangeText={setName} placeholder="Ej: Vacaciones, Laptop, Fondo..." error={errors.name} />
      <CurrencyPicker label="Moneda" value={currency} onChange={setCurrency} colors={colors} />
      <AmountInput label="Monto objetivo" value={targetAmount} onChangeText={setTargetAmount} />
      {errors.targetAmount && <Text style={[styles.error, { color: colors.danger }]}>{errors.targetAmount}</Text>}
      {!existing && <AmountInput label="Monto inicial (opcional)" value={initialAmount} onChangeText={setInitialAmount} />}
      <DatePicker label="Fecha límite (opcional)" value={deadline} onChange={setDeadline} optional placeholder="Sin fecha límite" />

      {/* Icon picker */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Ícono</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll} contentContainerStyle={styles.iconRow}>
        {GOAL_ICONS.map(ic => (
          <TouchableOpacity
            key={ic}
            onPress={() => setIcon(ic)}
            style={[styles.iconBtn, { backgroundColor: icon === ic ? color + '30' : colors.surfaceAlt, borderColor: icon === ic ? color : colors.border }]}
          >
            <Ionicons name={ic} size={22} color={icon === ic ? color : colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Color picker */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Color</Text>
      <View style={styles.colorRow}>
        {GOAL_COLORS.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorSelected]}
          >
            {color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Preview */}
      <View style={[styles.preview, { backgroundColor: color + '15', borderColor: color + '40' }]}>
        <Ionicons name={icon} size={32} color={color} />
        <Text style={[styles.previewName, { color }]}>{name || 'Mi Meta'}</Text>
      </View>

      <Button title={existing ? 'Guardar cambios' : 'Crear meta'} onPress={handleSave} loading={loading} style={styles.saveBtn} />
      {existing && <Button title="Eliminar meta" variant="danger" onPress={handleDelete} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  iconScroll: { maxHeight: 56, marginBottom: Spacing.md },
  iconRow: { gap: Spacing.sm },
  iconBtn: { width: 48, height: 48, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  colorBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorSelected: { borderWidth: 3, borderColor: '#fff' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.lg },
  previewName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  saveBtn: { marginBottom: Spacing.sm },
  error: { fontSize: FontSize.xs, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
});
