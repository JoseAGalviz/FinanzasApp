import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useApp } from '../../context/AppContext';
import { useDebts } from '../../hooks/useDebts';
import { useTransactions } from '../../hooks/useTransactions';
import { formatCurrency, formatPercent } from '../../utils/formatCurrency';
import { calculateCompoundInterest, calculateFIRE, calculateExtraPaymentImpact } from '../../utils/calculations';
import { Card } from '../../components/Card';
import { Input, AmountInput } from '../../components/Input';
import { Button } from '../../components/Button';
import { BorderRadius, FontSize, FontWeight, Spacing, CURRENCY_SYMBOLS, getCurrencySymbol } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CHART_W = width - Spacing.lg * 2 - 32;

const TABS = [
  { key: 'compound', label: 'Interés Compuesto' },
  { key: 'fire', label: 'FIRE' },
  { key: 'debt', label: 'Deudas' },
];

export default function ProjectionsScreen() {
  const { colors, currencyCode } = useApp();
  const { debts } = useDebts();
  const { getAverageIncome } = useTransactions();
  const [tab, setTab] = useState('compound');
  const [selectedCurrency, setSelectedCurrency] = useState(currencyCode || 'USD');
  const currencySymbol = getCurrencySymbol(selectedCurrency);

  // Compound
  const [principal, setPrincipal] = useState('1000');
  const [monthly, setMonthly] = useState('200');
  const [annualRate, setAnnualRate] = useState('8');
  const [years, setYears] = useState('10');
  const [compoundData, setCompoundData] = useState(null);

  // FIRE
  const [annualExpenses, setAnnualExpenses] = useState('30000');
  const [currentSavings, setCurrentSavings] = useState('5000');
  const [monthlyContrib, setMonthlyContrib] = useState('500');
  const [fireReturn, setFireReturn] = useState('7');
  const [fireResult, setFireResult] = useState(null);

  // Debt extra
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [extraPayment, setExtraPayment] = useState('100');
  const [debtImpact, setDebtImpact] = useState(null);

  function calcCompound() {
    const data = calculateCompoundInterest(
      parseFloat(principal) || 0,
      parseFloat(monthly) || 0,
      parseFloat(annualRate) || 0,
      parseInt(years) || 1
    );
    setCompoundData(data);
  }

  function calcFIRE() {
    const result = calculateFIRE(
      parseFloat(annualExpenses) || 0,
      parseFloat(currentSavings) || 0,
      parseFloat(monthlyContrib) || 0,
      parseFloat(fireReturn) || 7
    );
    setFireResult(result);
  }

  function calcDebtImpact() {
    if (!selectedDebt) return;
    const impact = calculateExtraPaymentImpact(selectedDebt, parseFloat(extraPayment) || 0);
    setDebtImpact(impact);
  }

  const finalValue = compoundData?.length > 0 ? compoundData[compoundData.length - 1]?.value : 0;
  const finalInvested = compoundData?.length > 0 ? compoundData[compoundData.length - 1]?.invested : 0;

  const lineData = compoundData?.map(d => ({ value: d.value })) || [];
  const investedLine = compoundData?.map(d => ({ value: d.invested })) || [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && { borderBottomColor: colors.primary }]}>
            <Text style={[styles.tabText, { color: tab === t.key ? colors.primary : colors.textSecondary }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Currency selector */}
      <View style={[styles.currencyBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {CURRENCY_SYMBOLS.map(c => (
          <TouchableOpacity
            key={c.code}
            onPress={() => setSelectedCurrency(c.code)}
            style={[styles.currencyChip, {
              backgroundColor: selectedCurrency === c.code ? colors.primary + '20' : colors.surfaceAlt,
              borderColor: selectedCurrency === c.code ? colors.primary : colors.border,
            }]}
          >
            <Text style={[styles.currencyChipText, { color: selectedCurrency === c.code ? colors.primary : colors.textSecondary }]}>
              {c.symbol} {c.code}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* COMPOUND INTEREST */}
        {tab === 'compound' && (
          <>
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Simulador de Ahorro</Text>
              <AmountInput label="Capital inicial" value={principal} onChangeText={setPrincipal} />
              <AmountInput label="Aportación mensual" value={monthly} onChangeText={setMonthly} />
              <Input label="Rentabilidad anual (%)" value={annualRate} onChangeText={setAnnualRate} keyboardType="decimal-pad" placeholder="Ej: 8" />
              <Input label="Plazo (años)" value={years} onChangeText={setYears} keyboardType="number-pad" placeholder="Ej: 10" />
              <Button title="Calcular" onPress={calcCompound} />
            </Card>

            {compoundData && compoundData.length > 0 && (
              <>
                <Card>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Resultado en {years} años</Text>
                  <View style={styles.resultRow}>
                    <ResultStat label="Valor final" value={formatCurrency(finalValue, currencySymbol)} color={colors.primary} colors={colors} />
                    <ResultStat label="Invertido" value={formatCurrency(finalInvested, currencySymbol)} color={colors.info} colors={colors} />
                    <ResultStat label="Ganancia" value={formatCurrency(finalValue - finalInvested, currencySymbol)} color={colors.primary} colors={colors} />
                  </View>
                  <Text style={[styles.gainLabel, { color: colors.textSecondary }]}>
                    Rendimiento total: {formatPercent(finalInvested > 0 ? ((finalValue - finalInvested) / finalInvested) * 100 : 0)}
                  </Text>
                </Card>

                <Card>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Crecimiento del Portafolio</Text>
                  {lineData.length > 1 && (
                    <LineChart
                      data={lineData}
                      data2={investedLine}
                      width={CHART_W}
                      height={200}
                      color={colors.primary}
                      color2={colors.info}
                      thickness={2.5}
                      thickness2={1.5}
                      startFillColor={colors.primary + '33'}
                      endFillColor={colors.primary + '05'}
                      areaChart
                      hideDataPoints
                      yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
                      hideRules
                      isAnimated
                    />
                  )}
                  <View style={styles.legend}>
                    <LegendItem color={colors.primary} label="Valor total" colors={colors} />
                    <LegendItem color={colors.info} label="Capital invertido" colors={colors} />
                  </View>
                </Card>

                {/* Compare: start today vs 6 months later */}
                <Card>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>¿Qué pasa si espero 6 meses?</Text>
                  {(() => {
                    const todayData = calculateCompoundInterest(parseFloat(principal), parseFloat(monthly), parseFloat(annualRate), parseInt(years));
                    const laterData = calculateCompoundInterest(0, parseFloat(monthly), parseFloat(annualRate), Math.max(1, parseInt(years) - 0.5));
                    const todayFinal = todayData[todayData.length - 1]?.value || 0;
                    const laterFinal = laterData[laterData.length - 1]?.value || 0;
                    const diff = todayFinal - laterFinal;
                    return (
                      <View>
                        <View style={styles.compareRow}>
                          <View style={[styles.compareCard, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.compareLabel, { color: colors.primary }]}>Empiezo hoy</Text>
                            <Text style={[styles.compareValue, { color: colors.primary }]}>{formatCurrency(todayFinal, currencySymbol)}</Text>
                          </View>
                          <View style={[styles.compareCard, { backgroundColor: colors.dangerLight }]}>
                            <Text style={[styles.compareLabel, { color: colors.danger }]}>En 6 meses</Text>
                            <Text style={[styles.compareValue, { color: colors.danger }]}>{formatCurrency(laterFinal, currencySymbol)}</Text>
                          </View>
                        </View>
                        <Text style={[styles.diffText, { color: colors.primary }]}>
                          Diferencia: {formatCurrency(diff, currencySymbol)} — ¡El tiempo importa!
                        </Text>
                      </View>
                    );
                  })()}
                </Card>
              </>
            )}
          </>
        )}

        {/* FIRE CALCULATOR */}
        {tab === 'fire' && (
          <>
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Calculadora FIRE</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>¿Cuánto necesitas para vivir de tus inversiones? (Regla del 4%)</Text>
              <AmountInput label="Gastos anuales deseados" value={annualExpenses} onChangeText={setAnnualExpenses} />
              <AmountInput label="Ahorros actuales" value={currentSavings} onChangeText={setCurrentSavings} />
              <AmountInput label="Aportación mensual" value={monthlyContrib} onChangeText={setMonthlyContrib} />
              <Input label="Rentabilidad anual esperada (%)" value={fireReturn} onChangeText={setFireReturn} keyboardType="decimal-pad" placeholder="Ej: 7" />
              <Button title="Calcular FIRE" onPress={calcFIRE} />
            </Card>

            {fireResult && (
              <>
                <Card>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Tu número FIRE</Text>
                  <Text style={[styles.fireTarget, { color: colors.primary }]}>{formatCurrency(fireResult.target, currencySymbol)}</Text>
                  <Text style={[styles.fireSub, { color: colors.textSecondary }]}>25x tus gastos anuales</Text>

                  <View style={styles.fireStats}>
                    <FireStat label="Tiempo estimado" value={`${fireResult.years} años`} color={colors.text} colors={colors} />
                    <FireStat label="Ingreso pasivo" value={`${formatCurrency(fireResult.monthlyPassiveIncome, currencySymbol)}/mes`} color={colors.primary} colors={colors} />
                  </View>

                  {fireResult.months > 0 && fireResult.months < 600 && (
                    <View style={[styles.fireNote, { backgroundColor: colors.infoLight }]}>
                      <Text style={[styles.fireNoteText, { color: colors.info }]}>
                        A tu ritmo actual, alcanzarías la independencia financiera en ~{fireResult.years} años ({new Date().getFullYear() + fireResult.years}).
                      </Text>
                    </View>
                  )}
                </Card>
              </>
            )}
          </>
        )}

        {/* DEBT PAYOFF SIMULATOR */}
        {tab === 'debt' && (
          <>
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Simulador de Deuda</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Selecciona una deuda y calcula el impacto de pagar extra:</Text>

              {debts.length === 0 ? (
                <Text style={[styles.emptyNote, { color: colors.textSecondary }]}>No hay deudas registradas.</Text>
              ) : (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.debtPills} contentContainerStyle={{ gap: Spacing.sm }}>
                    {debts.map(d => (
                      <TouchableOpacity
                        key={d.id}
                        onPress={() => { setSelectedDebt(d); setDebtImpact(null); }}
                        style={[styles.debtPill, { backgroundColor: selectedDebt?.id === d.id ? colors.danger : colors.surfaceAlt, borderColor: colors.danger }]}
                      >
                        <Text style={[styles.debtPillText, { color: selectedDebt?.id === d.id ? '#fff' : colors.textSecondary }]}>{d.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <AmountInput label="Pago extra mensual" value={extraPayment} onChangeText={setExtraPayment} />
                  <Button title="Calcular impacto" onPress={calcDebtImpact} disabled={!selectedDebt} />
                </>
              )}
            </Card>

            {debtImpact && selectedDebt && (
              <Card>
                {(() => {
                  const debtSym = getCurrencySymbol(selectedDebt.currency || selectedCurrency);
                  return (
                    <>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>Impacto en "{selectedDebt.name}"</Text>
                      <View style={styles.compareRow}>
                        <View style={[styles.compareCard, { backgroundColor: colors.dangerLight }]}>
                          <Text style={[styles.compareLabel, { color: colors.danger }]}>Sin extra</Text>
                          <Text style={[styles.compareValue, { color: colors.text }]}>{debtImpact.base.months}m</Text>
                          <Text style={[styles.compareSmall, { color: colors.textSecondary }]}>Intereses: {formatCurrency(debtImpact.base.interest, debtSym)}</Text>
                        </View>
                        <View style={[styles.compareCard, { backgroundColor: colors.successLight }]}>
                          <Text style={[styles.compareLabel, { color: colors.primary }]}>Con +{formatCurrency(extraPayment, debtSym)}</Text>
                          <Text style={[styles.compareValue, { color: colors.text }]}>{debtImpact.withExtra.months}m</Text>
                          <Text style={[styles.compareSmall, { color: colors.textSecondary }]}>Intereses: {formatCurrency(debtImpact.withExtra.interest, debtSym)}</Text>
                        </View>
                      </View>
                      <View style={[styles.fireNote, { backgroundColor: colors.successLight }]}>
                        <Text style={[styles.fireNoteText, { color: colors.primary }]}>
                          Ahorras {debtImpact.savedMonths} mes(es) y {formatCurrency(debtImpact.savedInterest, debtSym)} en intereses
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ResultStat({ label, value, color, colors }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[{ fontSize: FontSize.md, fontWeight: FontWeight.bold, color }]}>{value}</Text>
      <Text style={[{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2, textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

function FireStat({ label, value, color, colors }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[{ fontSize: FontSize.lg, fontWeight: FontWeight.bold, color }]}>{value}</Text>
      <Text style={[{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

function LegendItem({ color, label, colors }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={[{ fontSize: FontSize.xs, color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  currencyBar: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  currencyChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  currencyChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  cardSub: { fontSize: FontSize.sm, marginBottom: Spacing.md, lineHeight: 20 },
  resultRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  gainLabel: { fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.xs },
  legend: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
  compareRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  compareCard: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  compareLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginBottom: 4 },
  compareValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  compareSmall: { fontSize: FontSize.xs, marginTop: 4 },
  diffText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'center' },
  fireTarget: { fontSize: 36, fontWeight: FontWeight.bold, textAlign: 'center', marginVertical: Spacing.sm },
  fireSub: { fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.md },
  fireStats: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  fireNote: { padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  fireNoteText: { fontSize: FontSize.sm, lineHeight: 20 },
  debtPills: { maxHeight: 44, marginBottom: Spacing.md },
  debtPill: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, borderWidth: 1 },
  debtPillText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  emptyNote: { fontSize: FontSize.sm, textAlign: 'center', padding: Spacing.lg },
});
