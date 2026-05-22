import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { exportTransactionsCSV, exportFullBackupJSON, importBackupJSON, shareFile } from '../../utils/exportData';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/theme';

export default function ExportScreen() {
  const { colors } = useApp();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [lastAction, setLastAction] = useState('');

  async function handleExportCSV() {
    setCsvLoading(true);
    try {
      const uri = await exportTransactionsCSV(startDate || null, endDate || null);
      await shareFile(uri);
      setLastAction('CSV exportado correctamente');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCsvLoading(false);
    }
  }

  async function handleExportJSON() {
    setBackupLoading(true);
    try {
      const uri = await exportFullBackupJSON();
      await shareFile(uri);
      setLastAction('Respaldo JSON exportado correctamente');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleImport() {
    Alert.alert(
      'Importar respaldo',
      'Esto reemplazará TODOS tus datos actuales con los del archivo de respaldo. Esta acción no se puede deshacer. ¿Continuar?',
      [
        { text: 'Cancelar' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
              if (result.canceled) return;
              setImportLoading(true);
              await importBackupJSON(result.assets[0].uri);
              setLastAction('Datos importados correctamente');
              Alert.alert('Listo', 'Datos restaurados. Reinicia la app para ver los cambios.');
            } catch (e) {
              Alert.alert('Error al importar', e.message);
            } finally {
              setImportLoading(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      {lastAction ? (
        <View style={[styles.successBanner, { backgroundColor: colors.successLight }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <Text style={[styles.successText, { color: colors.primary }]}>{lastAction}</Text>
        </View>
      ) : null}

      {/* CSV Export */}
      <Card>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#3B82F6' + '20' }]}>
            <Ionicons name="document-text" size={24} color="#3B82F6" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Exportar Transacciones (CSV)</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Compatible con Excel, Google Sheets</Text>
          </View>
        </View>

        <Input
          label="Fecha inicio (opcional)"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          style={{ marginTop: Spacing.md }}
        />
        <Input
          label="Fecha fin (opcional)"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
        />

        <Button title="Exportar y Compartir CSV" onPress={handleExportCSV} loading={csvLoading} />
      </Card>

      {/* JSON Backup */}
      <Card>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#10B981' + '20' }]}>
            <Ionicons name="cloud-download" size={24} color="#10B981" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Respaldo Completo (JSON)</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Exporta todos tus datos para respaldo</Text>
          </View>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.infoLight }]}>
          {['Transacciones', 'Metas de ahorro', 'Deudas', 'Inversiones', 'Presupuestos', 'Configuración'].map(item => (
            <View key={item} style={styles.infoRow}>
              <Ionicons name="checkmark" size={14} color={colors.info} />
              <Text style={[styles.infoItem, { color: colors.info }]}>{item}</Text>
            </View>
          ))}
        </View>

        <Button title="Crear y Compartir Respaldo" onPress={handleExportJSON} loading={backupLoading} style={{ marginTop: Spacing.md }} />
      </Card>

      {/* Import */}
      <Card>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#F59E0B' + '20' }]}>
            <Ionicons name="cloud-upload" size={24} color="#F59E0B" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Restaurar desde Respaldo</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Importar un archivo JSON de respaldo</Text>
          </View>
        </View>

        <View style={[styles.warningBox, { backgroundColor: colors.dangerLight }]}>
          <Ionicons name="warning" size={16} color={colors.danger} />
          <Text style={[styles.warningText, { color: colors.danger }]}>
            Esta acción reemplazará TODOS los datos actuales con los del respaldo. No se puede deshacer.
          </Text>
        </View>

        <Button
          title="Seleccionar archivo JSON"
          variant="secondary"
          onPress={handleImport}
          loading={importLoading}
          style={{ marginTop: Spacing.md }}
        />
      </Card>

      {/* Tips */}
      <View style={[styles.tips, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.tipsTitle, { color: colors.text }]}>Consejos</Text>
        {[
          'Haz un respaldo mensual para no perder tus datos',
          'El CSV puede abrirse en Excel o Google Sheets',
          'Guarda el JSON en Google Drive o iCloud para seguridad',
          'Usa "Compartir" para enviar a WhatsApp, correo o Drive',
        ].map((tip, i) => (
          <Text key={i} style={[styles.tip, { color: colors.textSecondary }]}>· {tip}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  successText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  cardIcon: { width: 48, height: 48, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  cardSub: { fontSize: FontSize.xs, marginTop: 2 },
  infoBox: { padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  infoItem: { fontSize: FontSize.sm },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  warningText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  tips: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md },
  tipsTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  tip: { fontSize: FontSize.sm, lineHeight: 22 },
});
