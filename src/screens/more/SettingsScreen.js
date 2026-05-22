import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { CURRENCY_SYMBOLS } from '../../constants/theme';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/theme';
import { clearAllData } from '../../database/db';

const THEMES = [
  { key: 'system', label: 'Sistema', icon: 'phone-portrait' },
  { key: 'light', label: 'Claro', icon: 'sunny' },
  { key: 'dark', label: 'Oscuro', icon: 'moon' },
];

function daysAgo(dateStr) {
  if (!dateStr) return 'nunca';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  return `hace ${diff} días`;
}

export default function SettingsScreen() {
  const { colors, theme, currencySymbol, updateTheme, updateCurrency, exchangeRates, ratesUpdatedAt, updateExchangeRate } = useApp();
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [vesRate, setVesRate] = useState('');
  const [copRate, setCopRate] = useState('');
  const [savingRates, setSavingRates] = useState(false);

  useEffect(() => {
    setVesRate(String(exchangeRates.VES?.rate ?? 90));
    setCopRate(String(exchangeRates.COP?.rate ?? 4200));
  }, [exchangeRates]);

  async function handleSaveRates() {
    const ves = parseFloat(vesRate);
    const cop = parseFloat(copRate);
    if (!ves || ves <= 0 || !cop || cop <= 0) {
      Alert.alert('Error', 'Ingresa tasas válidas mayores a 0');
      return;
    }
    setSavingRates(true);
    try {
      await updateExchangeRate('VES', ves);
      await updateExchangeRate('COP', cop);
      Alert.alert('Listo', 'Tasas actualizadas. Se usarán en las próximas transacciones.');
    } finally {
      setSavingRates(false);
    }
  }

  function handleClearData() {
    Alert.alert(
      'Borrar todos los datos',
      'Se eliminarán todas las transacciones, inversiones, deudas, metas y presupuestos. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Listo', 'Datos eliminados. Ya puedes ingresar tus finanzas reales.');
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      {/* Theme */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Apariencia</Text>
        <View style={styles.themeRow}>
          {THEMES.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => updateTheme(t.key)}
              style={[
                styles.themeBtn,
                { backgroundColor: theme === t.key ? colors.primary + '20' : colors.surfaceAlt, borderColor: theme === t.key ? colors.primary : colors.border },
              ]}
            >
              <Ionicons name={t.icon} size={22} color={theme === t.key ? colors.primary : colors.textSecondary} />
              <Text style={[styles.themeBtnText, { color: theme === t.key ? colors.primary : colors.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Currency */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Moneda</Text>
        <TouchableOpacity
          onPress={() => setShowCurrencyModal(true)}
          style={[styles.currencyRow, { borderColor: colors.border }]}
        >
          <View style={[styles.currencyIcon, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.currencyIconText, { color: colors.primary }]}>{currencySymbol}</Text>
          </View>
          <View style={styles.currencyInfo}>
            <Text style={[styles.currencyLabel, { color: colors.text }]}>Símbolo de moneda</Text>
            <Text style={[styles.currencySub, { color: colors.textSecondary }]}>
              {CURRENCY_SYMBOLS.find(c => c.symbol === currencySymbol)?.name || currencySymbol}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </Card>

      {/* Exchange rates */}
      <Card>
        <View style={styles.ratesHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasas de cambio</Text>
          <Text style={[styles.ratesUpdated, { color: colors.textTertiary }]}>Actualizado {daysAgo(ratesUpdatedAt)}</Text>
        </View>
        <Text style={[styles.ratesSub, { color: colors.textSecondary }]}>
          Usa el precio paralelo/calle. Se aplica al guardar transacciones en VES o COP.
        </Text>
        <View style={styles.rateRow}>
          <View style={styles.rateField}>
            <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>VES por 1 USD</Text>
            <Input value={vesRate} onChangeText={setVesRate} keyboardType="numeric" placeholder="Ej: 90" />
          </View>
          <View style={styles.rateField}>
            <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>COP por 1 USD</Text>
            <Input value={copRate} onChangeText={setCopRate} keyboardType="numeric" placeholder="Ej: 4200" />
          </View>
        </View>
        {vesRate && copRate && parseFloat(vesRate) > 0 && parseFloat(copRate) > 0 && (
          <View style={[styles.ratePreview, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.ratePreviewText, { color: colors.primary }]}>
              1 COP = {(parseFloat(vesRate) / parseFloat(copRate)).toFixed(4)} VES
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={handleSaveRates}
          disabled={savingRates}
          style={[styles.saveRatesBtn, { backgroundColor: colors.primary, opacity: savingRates ? 0.6 : 1 }]}
        >
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.saveRatesBtnText}>{savingRates ? 'Guardando...' : 'Actualizar tasas'}</Text>
        </TouchableOpacity>
      </Card>

      {/* Data */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Datos</Text>
        <TouchableOpacity
          onPress={handleClearData}
          style={[styles.dangerRow, { borderColor: colors.danger + '40', backgroundColor: colors.danger + '10' }]}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <View style={styles.dangerInfo}>
            <Text style={[styles.dangerLabel, { color: colors.danger }]}>Borrar todos los datos</Text>
            <Text style={[styles.dangerSub, { color: colors.textSecondary }]}>Elimina transacciones, inversiones, deudas y metas</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.danger} />
        </TouchableOpacity>
      </Card>

      {/* About */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Acerca de</Text>
        {[
          { label: 'Versión', value: '1.0.0' },
          { label: 'Framework', value: 'React Native + Expo' },
          { label: 'Base de datos', value: 'SQLite (local)' },
        ].map(item => (
          <View key={item.label} style={[styles.infoRow, { borderTopColor: colors.divider }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
          </View>
        ))}
      </Card>

      <Modal visible={showCurrencyModal} onClose={() => setShowCurrencyModal(false)} title="Seleccionar Moneda">
        {CURRENCY_SYMBOLS.map(c => (
          <TouchableOpacity
            key={c.code}
            onPress={() => { updateCurrency(c.symbol); setShowCurrencyModal(false); }}
            style={[styles.currencyOption, { borderBottomColor: colors.divider, backgroundColor: currencySymbol === c.symbol ? colors.primaryLight : 'transparent' }]}
          >
            <Text style={[styles.currencyOptionSymbol, { color: colors.primary }]}>{c.symbol}</Text>
            <View>
              <Text style={[styles.currencyOptionName, { color: colors.text }]}>{c.name}</Text>
              <Text style={[styles.currencyOptionCode, { color: colors.textSecondary }]}>{c.code}</Text>
            </View>
            {currencySymbol === c.symbol && <Ionicons name="checkmark" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
          </TouchableOpacity>
        ))}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
  themeRow: { flexDirection: 'row', gap: Spacing.sm },
  themeBtn: { flex: 1, alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, gap: Spacing.xs },
  themeBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, padding: Spacing.md, borderRadius: BorderRadius.md },
  currencyIcon: { width: 44, height: 44, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  currencyIconText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  currencyInfo: { flex: 1 },
  currencyLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  currencySub: { fontSize: FontSize.xs, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  infoLabel: { fontSize: FontSize.sm },
  infoValue: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  currencyOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  currencyOptionSymbol: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, width: 40, textAlign: 'center' },
  currencyOptionName: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  currencyOptionCode: { fontSize: FontSize.xs, marginTop: 2 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, padding: Spacing.md, borderRadius: BorderRadius.md },
  dangerInfo: { flex: 1 },
  dangerLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  dangerSub: { fontSize: FontSize.xs, marginTop: 2 },
  ratesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  ratesUpdated: { fontSize: FontSize.xs },
  ratesSub: { fontSize: FontSize.xs, marginBottom: Spacing.md, lineHeight: 18 },
  rateRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  rateField: { flex: 1 },
  rateLabel: { fontSize: FontSize.xs, marginBottom: 4 },
  ratePreview: { padding: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.md, alignItems: 'center' },
  ratePreviewText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  saveRatesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, padding: Spacing.md, borderRadius: BorderRadius.md },
  saveRatesBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
