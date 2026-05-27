import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useBills } from '../../hooks/useBills';
import { useNotifications } from '../../hooks/useNotifications';
import { Input, AmountInput } from '../../components/Input';
import { TimePicker } from '../../components/TimePicker';
import { Button } from '../../components/Button';
import { BorderRadius, FontSize, FontWeight, Spacing, CURRENCY_SYMBOLS } from '../../constants/theme';

const BILL_CATEGORIES = [
  { id: 'housing', name: 'Vivienda', icon: 'home', color: '#10B981' },
  { id: 'utilities', name: 'Servicios', icon: 'flash', color: '#3B82F6' },
  { id: 'subscriptions', name: 'Suscripción', icon: 'repeat', color: '#6366F1' },
  { id: 'loan', name: 'Préstamo', icon: 'card', color: '#EF4444' },
  { id: 'insurance', name: 'Seguro', icon: 'shield', color: '#F59E0B' },
  { id: 'education', name: 'Educación', icon: 'school', color: '#8B5CF6' },
  { id: 'other', name: 'Otro', icon: 'receipt', color: '#6B7280' },
];

const BILL_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];

const NOTIFY_OPTIONS = [
  { days: 1, label: '1 día antes' },
  { days: 2, label: '2 días antes' },
  { days: 3, label: '3 días antes' },
  { days: 5, label: '5 días antes' },
  { days: 7, label: '1 semana antes' },
];

const DUE_DAYS = [
  { value: 1, label: 'Día 1' }, { value: 5, label: 'Día 5' }, { value: 10, label: 'Día 10' },
  { value: 15, label: 'Día 15' }, { value: 20, label: 'Día 20' }, { value: 25, label: 'Día 25' },
  { value: 28, label: 'Día 28' }, { value: 30, label: 'Día 30' }, { value: 0, label: 'Último día' },
];

export default function AddBillScreen({ route, navigation }) {
  const existing = route.params?.bill;
  const { colors } = useApp();
  const { addBill, updateBill } = useBills();
  const { scheduleBillNotifications } = useNotifications();

  const [name, setName] = useState(existing?.name || '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [currency, setCurrency] = useState(existing?.currency || 'USD');
  const [dueDay, setDueDay] = useState(existing?.due_day ?? 1);
  const [category, setCategory] = useState(existing?.category || 'other');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(existing?.notify_days_before ?? 3);
  const [notifyTime, setNotifyTime] = useState(existing?.notify_time || '09:00');
  const [selectedColor, setSelectedColor] = useState(existing?.color || '#EF4444');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const selectedCat = BILL_CATEGORIES.find(c => c.id === category);

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Ingresa un nombre';
    if (!amount || parseFloat(amount) <= 0) e.amount = 'Ingresa un monto válido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        amount: parseFloat(amount),
        currency,
        due_day: dueDay,
        category,
        notes: notes.trim() || null,
        notify_days_before: notifyDaysBefore,
        notify_time: notifyTime,
        color: selectedColor,
        icon: selectedCat?.icon || 'receipt',
        is_active: true,
      };
      if (existing) {
        await updateBill(existing.id, data);
      } else {
        await addBill(data);
      }
      scheduleBillNotifications().catch(() => {});
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Input
          label="Nombre de la responsabilidad"
          value={name}
          onChangeText={setName}
          placeholder="Ej: Arriendo, Netflix, Internet"
          error={errors.name}
        />

        {/* Amount */}
        <AmountInput value={amount} onChangeText={setAmount} style={{ marginTop: Spacing.sm }} />
        {errors.amount && <Text style={[styles.error, { color: colors.danger }]}>{errors.amount}</Text>}

        {/* Currency */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Moneda</Text>
        <View style={styles.chipRow}>
          {CURRENCY_SYMBOLS.map(c => (
            <TouchableOpacity
              key={c.code}
              onPress={() => setCurrency(c.code)}
              style={[styles.chip, {
                backgroundColor: currency === c.code ? colors.primary + '20' : colors.surfaceAlt,
                borderColor: currency === c.code ? colors.primary : colors.border,
              }]}
            >
              <Text style={[styles.chipText, { color: currency === c.code ? colors.primary : colors.textSecondary }]}>
                {c.symbol} {c.code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Due day */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Día de vencimiento</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.chipRow}>
          {DUE_DAYS.map(d => (
            <TouchableOpacity
              key={d.value}
              onPress={() => setDueDay(d.value)}
              style={[styles.chip, {
                backgroundColor: dueDay === d.value ? colors.info + '20' : colors.surfaceAlt,
                borderColor: dueDay === d.value ? colors.info : colors.border,
              }]}
            >
              <Text style={[styles.chipText, { color: dueDay === d.value ? colors.info : colors.textSecondary }]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Categoría</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.catRow}>
          {BILL_CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              onPress={() => { setCategory(c.id); setSelectedColor(c.color); }}
              style={[styles.catItem, {
                borderColor: category === c.id ? c.color : colors.border,
                backgroundColor: category === c.id ? c.color + '20' : colors.surfaceAlt,
              }]}
            >
              <Ionicons name={c.icon} size={20} color={c.color} />
              <Text style={[styles.catLabel, { color: category === c.id ? c.color : colors.textSecondary }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Notify days */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Notificar</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.chipRow}>
          {NOTIFY_OPTIONS.map(n => (
            <TouchableOpacity
              key={n.days}
              onPress={() => setNotifyDaysBefore(n.days)}
              style={[styles.chip, {
                backgroundColor: notifyDaysBefore === n.days ? colors.warning + '20' : colors.surfaceAlt,
                borderColor: notifyDaysBefore === n.days ? colors.warning : colors.border,
              }]}
            >
              <Text style={[styles.chipText, { color: notifyDaysBefore === n.days ? colors.warning : colors.textSecondary }]}>{n.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Notify time */}
        <TimePicker
          label="Hora de la notificación"
          value={notifyTime}
          onChange={setNotifyTime}
        />

        {/* Notes */}
        <Input
          label="Notas (opcional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Ej: Cuenta bancaria, referencia..."
          multiline
          numberOfLines={2}
        />

        {/* Color picker */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Color</Text>
        <View style={styles.colorRow}>
          {BILL_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setSelectedColor(c)}
              style={[styles.colorDot, { backgroundColor: c, borderWidth: selectedColor === c ? 3 : 0, borderColor: colors.text }]}
            />
          ))}
        </View>

        <Button
          title={existing ? 'Guardar Cambios' : 'Agregar Responsabilidad'}
          onPress={handleSave}
          loading={loading}
          style={styles.saveBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm, marginTop: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  chipText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  scroll: { maxHeight: 56 },
  catRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  catItem: {
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    width: 80,
    gap: 4,
  },
  catLabel: { fontSize: FontSize.xs, textAlign: 'center', fontWeight: FontWeight.medium },
  colorRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  error: { fontSize: FontSize.xs, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  saveBtn: { marginTop: Spacing.lg },
});
