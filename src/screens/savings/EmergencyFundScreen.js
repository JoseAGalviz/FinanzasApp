import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useEmergencyFund } from '../../hooks/useEmergencyFund';
import { formatCurrency, formatPercent } from '../../utils/formatCurrency';
import { ProgressBar } from '../../components/ProgressBar';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { AmountInput, Input } from '../../components/Input';
import { BorderRadius, FontSize, FontWeight, Spacing, getCurrencySymbol } from '../../constants/theme';
import { CurrencyPicker } from '../../components/CurrencyPicker';

const MONTH_OPTIONS = [1, 3, 6, 9, 12];

export default function EmergencyFundScreen() {
  const { colors, currencyCode } = useApp();
  const { fund, loading, fetchFund, updateConfig, addContribution, withdraw } = useEmergencyFund();
  const [showConfig, setShowConfig] = useState(false);
  const [showContrib, setShowContrib] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [targetMonths, setTargetMonths] = useState('6');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [fundCurrency, setFundCurrency] = useState(currencyCode || 'USD');
  const [contribAmount, setContribAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    fetchFund().then(f => {
      if (f) {
        setTargetMonths(String(f.target_months));
        setMonthlyExpenses(String(f.monthly_expenses));
        setFundCurrency(f.currency || currencyCode || 'USD');
      }
    });
  }, []));

  async function handleSaveConfig() {
    setSaving(true);
    try {
      await updateConfig(parseFloat(targetMonths) || 6, parseFloat(monthlyExpenses) || 0, fundCurrency);
      setShowConfig(false);
      await fetchFund();
    } finally {
      setSaving(false);
    }
  }

  async function handleContrib() {
    if (!contribAmount || parseFloat(contribAmount) <= 0) { Alert.alert('Error', 'Ingresa un monto válido'); return; }
    setSaving(true);
    try {
      await addContribution(contribAmount);
      setContribAmount('');
      setShowContrib(false);
      await fetchFund();
    } finally {
      setSaving(false);
    }
  }

  async function handleWithdraw() {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) { Alert.alert('Error', 'Ingresa un monto válido'); return; }
    setSaving(true);
    try {
      await withdraw(withdrawAmount);
      setWithdrawAmount('');
      setShowWithdraw(false);
      await fetchFund();
    } finally {
      setSaving(false);
    }
  }

  const target = fund?.target_amount || 0;
  const current = fund?.current_amount || 0;
  const progress = fund?.progress || 0;
  const pct = Math.round(progress * 100);
  const statusColor = pct >= 100 ? colors.primary : pct >= 60 ? colors.warning : colors.danger;
  const sym = getCurrencySymbol(fund?.currency || fundCurrency);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: pct >= 100 ? colors.primary : colors.warning }]}>
          <Ionicons name="shield-checkmark" size={56} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroTitle}>Fondo de Emergencia</Text>
          <Text style={styles.heroAmount}>{formatCurrency(current, sym)}</Text>
          <Text style={styles.heroTarget}>Objetivo: {formatCurrency(target, sym)}</Text>
          <View style={[styles.heroProgress, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <View style={[styles.heroFill, { width: `${Math.min(pct, 100)}%` }]} />
          </View>
          <Text style={styles.heroPct}>{pct}% · {fund?.target_months || 0} meses cubiertos</Text>
        </View>

        {/* Status */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Estado</Text>
          <View style={styles.statusRow}>
            <Ionicons name={pct >= 100 ? 'checkmark-circle' : 'alert-circle'} size={22} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {pct >= 100 ? '¡Fondo completamente fondeado! Estás protegido.' :
               pct >= 60 ? `Vas bien. Faltan ${formatCurrency(target - current, sym)} para completarlo.` :
               `Necesitas ${formatCurrency(target - current, sym)} más para alcanzar tu objetivo.`}
            </Text>
          </View>

          {fund && (
            <View style={styles.statsGrid}>
              <StatItem label="Ahorrado" value={formatCurrency(current, sym)} color={colors.primary} colors={colors} />
              <StatItem label="Objetivo" value={formatCurrency(target, sym)} color={colors.text} colors={colors} />
              <StatItem label="Meses objetivo" value={`${fund.target_months}m`} color={colors.info} colors={colors} />
              <StatItem label="Gasto mensual" value={formatCurrency(fund.monthly_expenses, sym)} color={colors.textSecondary} colors={colors} />
            </View>
          )}
        </Card>

        {/* Month selector */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Configurar Cobertura</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>¿Cuántos meses deseas cubrir?</Text>
          <View style={styles.monthsRow}>
            {MONTH_OPTIONS.map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => { setTargetMonths(String(m)); updateConfig(m, fund?.monthly_expenses || 0).then(() => fetchFund()); }}
                style={[styles.monthBtn, { backgroundColor: fund?.target_months === m ? colors.primary : colors.surfaceAlt, borderColor: fund?.target_months === m ? colors.primary : colors.border }]}
              >
                <Text style={[styles.monthBtnText, { color: fund?.target_months === m ? '#fff' : colors.textSecondary }]}>{m}m</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button title="Configurar gastos mensuales" variant="outline" onPress={() => setShowConfig(true)} />
        </Card>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Button title="Aportar" onPress={() => setShowContrib(true)} style={styles.actionBtn} />
          <Button title="Retirar" variant="secondary" onPress={() => setShowWithdraw(true)} style={styles.actionBtn} />
        </View>
      </ScrollView>

      {/* Config Modal */}
      <Modal visible={showConfig} onClose={() => setShowConfig(false)} title="Configurar Fondo">
        <CurrencyPicker label="Moneda del fondo" value={fundCurrency} onChange={setFundCurrency} colors={colors} />
        <AmountInput label="Gasto mensual promedio" value={monthlyExpenses} onChangeText={setMonthlyExpenses} />
        <Input label="Meses objetivo" value={targetMonths} onChangeText={setTargetMonths} keyboardType="numeric" />
        {monthlyExpenses && targetMonths && (
          <View style={[styles.calcPreview, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.calcText, { color: colors.primary }]}>
              Objetivo calculado: {formatCurrency((parseFloat(monthlyExpenses) || 0) * (parseFloat(targetMonths) || 0), sym)}
            </Text>
          </View>
        )}
        <Button title="Guardar" onPress={handleSaveConfig} loading={saving} />
      </Modal>

      {/* Contrib Modal */}
      <Modal visible={showContrib} onClose={() => setShowContrib(false)} title="Agregar al Fondo">
        <AmountInput label="Monto a agregar" value={contribAmount} onChangeText={setContribAmount} />
        <Button title="Guardar" onPress={handleContrib} loading={saving} />
      </Modal>

      {/* Withdraw Modal */}
      <Modal visible={showWithdraw} onClose={() => setShowWithdraw(false)} title="Retirar del Fondo">
        <AmountInput label="Monto a retirar" value={withdrawAmount} onChangeText={setWithdrawAmount} />
        <Button title="Retirar" variant="danger" onPress={handleWithdraw} loading={saving} />
      </Modal>
    </View>
  );
}

function StatItem({ label, value, color, colors }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: Spacing.xxl },
  hero: { padding: Spacing.xxl, alignItems: 'center', paddingTop: 48 },
  heroTitle: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginTop: Spacing.md },
  heroAmount: { color: '#fff', fontSize: 36, fontWeight: FontWeight.bold, marginTop: Spacing.sm },
  heroTarget: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.md },
  heroProgress: { width: '80%', height: 8, borderRadius: 4, marginTop: Spacing.md, overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: 4, backgroundColor: '#fff' },
  heroPct: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm, marginTop: Spacing.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  cardSub: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.md },
  statusText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statItem: { width: '47%', backgroundColor: 'transparent' },
  statVal: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  monthsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  monthBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center' },
  monthBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  actionsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.md },
  actionBtn: { flex: 1 },
  calcPreview: { padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  calcText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
