import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../context/AppContext';
import { useTransactions } from '../../hooks/useTransactions';
import { useNotifications } from '../../hooks/useNotifications';
import { getDb } from '../../database/db';
import { Input, AmountInput } from '../../components/Input';
import { DatePicker } from '../../components/DatePicker';
import { TimePicker } from '../../components/TimePicker';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/Modal';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants/categories';
import { todayISO } from '../../utils/formatDate';
import { BorderRadius, FontSize, FontWeight, Spacing, CURRENCY_SYMBOLS } from '../../constants/theme';

export default function AddTransactionScreen({ route, navigation }) {
  const existing = route.params?.transaction;
  const { colors, currencyCode, convertToUSDWithRateType } = useApp();
  const { addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { scheduleRecurringIncomeReminders } = useNotifications();

  const [type, setType] = useState(existing?.type || 'expense');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [category, setCategory] = useState(existing?.category || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [date, setDate] = useState(existing?.date || todayISO());
  const [isRecurring, setIsRecurring] = useState(existing?.is_recurring === 1 || false);
  const [recurringNotifyTime, setRecurringNotifyTime] = useState(existing?.recurring_notify_time || '09:00');
  const [receiptUri, setReceiptUri] = useState(existing?.receipt_uri || null);
  const [currency, setCurrency] = useState(existing?.currency || currencyCode || 'USD');
  const [rateType, setRateType] = useState(existing?.rate_type || 'parallel');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDelete, setShowDelete] = useState(false);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!existing && category) setCategory('');
  }, [type, existing]);

  function validate() {
    const e = {};
    if (!amount || parseFloat(amount) <= 0) e.amount = 'Ingresa un monto válido';
    if (!category) e.category = 'Selecciona una categoría';
    if (!date) e.date = 'Selecciona una fecha';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      const effectiveRateType = currency === 'VES' ? rateType : 'parallel';
      const usd_equivalent = convertToUSDWithRateType(parseFloat(amount), currency, effectiveRateType);
      const data = {
        type, amount: parseFloat(amount), category, description, date,
        is_recurring: isRecurring,
        recurring_day: isRecurring ? (parseInt(date.split('-')[2], 10)) : null,
        recurring_notify_time: isRecurring ? recurringNotifyTime : null,
        receipt_uri: receiptUri, currency,
        rate_type: effectiveRateType,
        usd_equivalent,
      };
      if (existing) {
        await updateTransaction(existing.id, data);
      } else {
        await addTransaction(data);
      }
      if (isRecurring) {
        // Save preferred notification time in notifications_config
        const db = getDb();
        await db.runAsync(
          "UPDATE notifications_config SET time=? WHERE type='recurring_income'",
          [recurringNotifyTime]
        ).catch(() => {});
        scheduleRecurringIncomeReminders().catch(() => {});
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    await deleteTransaction(existing.id);
    setShowDelete(false);
    navigation.goBack();
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesita acceso a la galería para adjuntar recibos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesita acceso a la cámara para tomar fotos de recibos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Toggle */}
        <View style={[styles.typeToggle, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'expense' && { backgroundColor: colors.danger }]}
            onPress={() => setType('expense')}
          >
            <Text style={[styles.typeBtnText, { color: type === 'expense' ? '#fff' : colors.textSecondary }]}>Gasto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'income' && { backgroundColor: colors.primary }]}
            onPress={() => setType('income')}
          >
            <Text style={[styles.typeBtnText, { color: type === 'income' ? '#fff' : colors.textSecondary }]}>Ingreso</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <AmountInput value={amount} onChangeText={setAmount} style={{ marginTop: Spacing.md }} />
        {errors.amount && <Text style={[styles.error, { color: colors.danger }]}>{errors.amount}</Text>}

        {/* Currency */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Moneda</Text>
        <View style={styles.currencyRow}>
          {CURRENCY_SYMBOLS.map(c => (
            <TouchableOpacity
              key={c.code}
              onPress={() => setCurrency(c.code)}
              style={[
                styles.currencyChip,
                {
                  backgroundColor: currency === c.code ? colors.primary + '20' : colors.surfaceAlt,
                  borderColor: currency === c.code ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.currencyChipSymbol, { color: currency === c.code ? colors.primary : colors.textSecondary }]}>
                {c.symbol}
              </Text>
              <Text style={[styles.currencyChipCode, { color: currency === c.code ? colors.primary : colors.textSecondary }]}>
                {c.code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Categoría</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catRow}>
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategory(c.id)}
              style={[styles.catItem, { borderColor: category === c.id ? c.color : colors.border, backgroundColor: category === c.id ? c.color + '20' : colors.surfaceAlt }]}
            >
              <Ionicons name={c.icon} size={20} color={c.color} />
              <Text style={[styles.catLabel, { color: category === c.id ? c.color : colors.textSecondary }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {errors.category && <Text style={[styles.error, { color: colors.danger }]}>{errors.category}</Text>}

        {/* Description */}
        <Input
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Ej: Supermercado del mes"
          multiline
          numberOfLines={2}
        />

        {/* Date */}
        <DatePicker
          label="Fecha"
          value={date}
          onChange={setDate}
        />
        {errors.date && <Text style={[styles.error, { color: colors.danger }]}>{errors.date}</Text>}

        {/* VES rate type selector */}
        {currency === 'VES' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Tasa a usar</Text>
            <View style={[styles.typeToggle, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.typeBtn, rateType === 'parallel' && { backgroundColor: colors.warning }]}
                onPress={() => setRateType('parallel')}
              >
                <Text style={[styles.typeBtnText, { color: rateType === 'parallel' ? '#fff' : colors.textSecondary }]}>Paralelo/Calle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, rateType === 'bcv' && { backgroundColor: colors.info }]}
                onPress={() => setRateType('bcv')}
              >
                <Text style={[styles.typeBtnText, { color: rateType === 'bcv' ? '#fff' : colors.textSecondary }]}>BCV Oficial</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Recurring toggle */}
        <View style={[styles.rowField, { borderColor: colors.border }]}>
          <View>
            <Text style={[styles.rowFieldLabel, { color: colors.text }]}>Recurrente</Text>
            <Text style={[styles.rowFieldSub, { color: colors.textSecondary }]}>Se repite cada mes</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Recurring day info + time picker */}
        {isRecurring && (
          <>
            <View style={[styles.recurringInfo, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}>
              <Ionicons name="repeat" size={16} color={colors.primary} />
              <Text style={[styles.recurringInfoText, { color: colors.primary }]}>
                Se repetirá cada mes el día {parseInt(date.split('-')[2], 10)}
              </Text>
            </View>
            <TimePicker
              label="Hora del recordatorio"
              value={recurringNotifyTime}
              onChange={setRecurringNotifyTime}
            />
          </>
        )}

        {/* Receipt (only for expenses) */}
        {type === 'expense' && (
          <View style={styles.receiptSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Foto del recibo</Text>
            {receiptUri ? (
              <View style={styles.receiptPreview}>
                <Image source={{ uri: receiptUri }} style={styles.receiptImage} />
                <TouchableOpacity
                  onPress={() => setReceiptUri(null)}
                  style={[styles.removeReceipt, { backgroundColor: colors.danger }]}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.receiptBtns}>
                <TouchableOpacity
                  onPress={pickImage}
                  style={[styles.receiptBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                >
                  <Ionicons name="image" size={20} color={colors.textSecondary} />
                  <Text style={[styles.receiptBtnText, { color: colors.textSecondary }]}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={takePhoto}
                  style={[styles.receiptBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                >
                  <Ionicons name="camera" size={20} color={colors.textSecondary} />
                  <Text style={[styles.receiptBtnText, { color: colors.textSecondary }]}>Cámara</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Save button */}
        <Button title={existing ? 'Guardar Cambios' : 'Agregar'} onPress={handleSave} loading={loading} style={styles.saveBtn} />

        {/* Delete */}
        {existing && (
          <Button title="Eliminar" variant="danger" onPress={() => setShowDelete(true)} style={styles.deleteBtn} />
        )}
      </ScrollView>

      <ConfirmModal
        visible={showDelete}
        title="Eliminar transacción"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  typeBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  catScroll: { maxHeight: 120, marginBottom: Spacing.md },
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
  rowField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
  },
  rowFieldLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  rowFieldSub: { fontSize: FontSize.xs, marginTop: 2 },
  receiptSection: { marginBottom: Spacing.md },
  receiptBtns: { flexDirection: 'row', gap: Spacing.md },
  receiptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  receiptBtnText: { fontSize: FontSize.sm },
  receiptPreview: { position: 'relative' },
  receiptImage: { width: '100%', height: 180, borderRadius: BorderRadius.md, resizeMode: 'cover' },
  removeReceipt: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: { marginTop: Spacing.md },
  deleteBtn: { marginTop: Spacing.sm },
  error: { fontSize: FontSize.xs, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  recurringInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  recurringInfoText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  currencyRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  currencyChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: 2,
  },
  currencyChipSymbol: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  currencyChipCode: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
});
