import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { useDebts } from '../../hooks/useDebts';
import { Input, AmountInput } from '../../components/Input';
import { DatePicker } from '../../components/DatePicker';
import { Button } from '../../components/Button';
import { todayISO } from '../../utils/formatDate';
import { Spacing } from '../../constants/theme';

export default function AddDebtScreen({ route, navigation }) {
  const existing = route.params?.debt;
  const { colors } = useApp();
  const { addDebt, updateDebt, deleteDebt } = useDebts();

  const [name, setName] = useState(existing?.name || '');
  const [totalAmount, setTotalAmount] = useState(existing ? String(existing.total_amount) : '');
  const [remainingAmount, setRemainingAmount] = useState(existing ? String(existing.remaining_amount) : '');
  const [interestRate, setInterestRate] = useState(existing ? String(existing.interest_rate) : '');
  const [minimumPayment, setMinimumPayment] = useState(existing ? String(existing.minimum_payment) : '');
  const [dueDate, setDueDate] = useState(existing?.due_date || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Ingresa un nombre';
    if (!totalAmount || parseFloat(totalAmount) <= 0) e.totalAmount = 'Ingresa el monto total';
    if (!remainingAmount || parseFloat(remainingAmount) <= 0) e.remainingAmount = 'Ingresa el saldo restante';
    if (!minimumPayment || parseFloat(minimumPayment) <= 0) e.minimumPayment = 'Ingresa el pago mínimo';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        total_amount: parseFloat(totalAmount),
        remaining_amount: parseFloat(remainingAmount),
        interest_rate: parseFloat(interestRate) || 0,
        minimum_payment: parseFloat(minimumPayment),
        due_date: dueDate || null,
        strategy: 'avalanche',
      };
      if (existing) { await updateDebt(existing.id, data); }
      else { await addDebt(data); }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    Alert.alert('Eliminar deuda', '¿Seguro? Se eliminarán todos los pagos registrados.', [
      { text: 'Cancelar' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteDebt(existing.id); navigation.goBack(); } },
    ]);
  }

  return (
    <ScrollView style={[{ flex: 1, backgroundColor: colors.background }]} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Input label="Nombre de la deuda" value={name} onChangeText={setName} placeholder="Ej: Tarjeta Visa, Préstamo Auto..." error={errors.name} />
      <AmountInput label="Monto original total" value={totalAmount} onChangeText={setTotalAmount} />
      {errors.totalAmount && <Text style={{ color: colors.danger, fontSize: 12, marginTop: -12, marginBottom: 12 }}>{errors.totalAmount}</Text>}
      <AmountInput label="Saldo restante" value={remainingAmount} onChangeText={setRemainingAmount} />
      {errors.remainingAmount && <Text style={{ color: colors.danger, fontSize: 12, marginTop: -12, marginBottom: 12 }}>{errors.remainingAmount}</Text>}
      <Input label="Tasa de interés anual (%)" value={interestRate} onChangeText={setInterestRate} keyboardType="decimal-pad" placeholder="Ej: 18.5" suffix="%" />
      <AmountInput label="Pago mínimo mensual" value={minimumPayment} onChangeText={setMinimumPayment} />
      {errors.minimumPayment && <Text style={{ color: colors.danger, fontSize: 12, marginTop: -12, marginBottom: 12 }}>{errors.minimumPayment}</Text>}
      <DatePicker label="Fecha de vencimiento (próximo pago)" value={dueDate} onChange={setDueDate} optional placeholder="Sin fecha de vencimiento" />

      <Button title={existing ? 'Guardar cambios' : 'Agregar deuda'} onPress={handleSave} loading={loading} style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }} />
      {existing && <Button title="Eliminar deuda" variant="danger" onPress={handleDelete} />}
    </ScrollView>
  );
}
