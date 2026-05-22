import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { getDb } from '../../database/db';
import { useNotifications } from '../../hooks/useNotifications';
import { Card } from '../../components/Card';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/theme';

const NOTIFICATION_TYPES = [
  { key: 'budget_alert', title: 'Alerta de Presupuesto', subtitle: 'Cuando una categoría supera el 80% del límite', icon: 'wallet', color: '#3B82F6' },
  { key: 'goal_reminder', title: 'Recordatorio de Meta', subtitle: 'Si no has contribuido en la última semana', icon: 'trophy', color: '#10B981' },
  { key: 'debt_reminder', title: 'Recordatorio de Deuda', subtitle: 'Antes del vencimiento del pago', icon: 'card', color: '#EF4444' },
  { key: 'emergency_fund_alert', title: 'Fondo de Emergencia', subtitle: 'Si el fondo está por debajo del objetivo', icon: 'shield-checkmark', color: '#F59E0B' },
];

const DAYS_OPTIONS = [1, 3, 7];

const TEST_CONTENT = {
  budget_alert: { title: 'Alerta de Presupuesto', body: 'Has usado el 82% de tu presupuesto de Comida.' },
  goal_reminder: { title: 'Recordatorio de Meta', body: 'Sin aportes esta semana. ¡Mantén el ritmo!' },
  debt_reminder: { title: 'Pago próximo a vencer', body: 'Tu pago vence en 3 días. Recuerda hacerlo.' },
  emergency_fund_alert: { title: 'Fondo de Emergencia', body: 'Tu fondo está al 60% del objetivo. Sigue aportando.' },
};

export default function NotificationsScreen() {
  const { colors } = useApp();
  const { scheduleAllNotifications } = useNotifications();
  const [config, setConfig] = useState({});
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    loadConfig();
    checkPermissions();
  }, []);

  async function checkPermissions() {
    try {
      const N = await import('expo-notifications');
      const { status } = await N.getPermissionsAsync();
      setPermissionGranted(status === 'granted');
    } catch {
      setPermissionGranted(false);
    }
  }

  async function requestPermissions() {
    try {
      const N = await import('expo-notifications');
      const { status } = await N.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Habilita las notificaciones en Configuración del dispositivo.');
      }
    } catch {
      setPermissionGranted(false);
    }
  }

  async function loadConfig() {
    const db = getDb();
    const rows = await db.getAllAsync('SELECT * FROM notifications_config');
    const map = {};
    for (const r of rows) map[r.type] = r;
    setConfig(map);
    setLoading(false);
  }

  async function toggleNotification(type, enabled) {
    const db = getDb();
    await db.runAsync('UPDATE notifications_config SET enabled=? WHERE type=?', [enabled ? 1 : 0, type]);
    setConfig(prev => ({ ...prev, [type]: { ...prev[type], enabled: enabled ? 1 : 0 } }));
    if (enabled && !permissionGranted) await requestPermissions();
  }

  async function updateDaysBefore(type, days) {
    const db = getDb();
    await db.runAsync('UPDATE notifications_config SET days_before=? WHERE type=?', [days, type]);
    setConfig(prev => ({ ...prev, [type]: { ...prev[type], days_before: days } }));
  }

  async function testNotification(type) {
    if (!permissionGranted) {
      Alert.alert('Permisos', 'Habilita las notificaciones primero.');
      return;
    }
    const content = TEST_CONTENT[type];
    if (content) {
      try {
        const N = await import('expo-notifications');
        await N.scheduleNotificationAsync({
          content: { ...content, sound: true },
          trigger: null,
        });
      } catch {
        Alert.alert('Error', 'No se pudo enviar la notificación de prueba.');
      }
    }
  }

  async function handleScheduleAll() {
    if (!permissionGranted) {
      await requestPermissions();
      return;
    }
    setScheduling(true);
    try {
      const now = new Date();
      await scheduleAllNotifications(now.getMonth() + 1, now.getFullYear());
      Alert.alert('Listo', 'Notificaciones programadas correctamente.');
    } finally {
      setScheduling(false);
    }
  }

  if (loading) return null;

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      {/* Permission banner */}
      {!permissionGranted && (
        <TouchableOpacity
          onPress={requestPermissions}
          style={[styles.permBanner, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}
        >
          <Ionicons name="notifications-off" size={20} color={colors.warning} />
          <View style={styles.permInfo}>
            <Text style={[styles.permTitle, { color: colors.warning }]}>Notificaciones deshabilitadas</Text>
            <Text style={[styles.permSub, { color: colors.textSecondary }]}>Toca para habilitar</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.warning} />
        </TouchableOpacity>
      )}

      {NOTIFICATION_TYPES.map(n => {
        const c = config[n.key] || {};
        const enabled = c.enabled === 1;
        return (
          <Card key={n.key}>
            <View style={styles.notifHeader}>
              <View style={[styles.notifIcon, { backgroundColor: n.color + '20' }]}>
                <Ionicons name={n.icon} size={22} color={n.color} />
              </View>
              <View style={styles.notifInfo}>
                <Text style={[styles.notifTitle, { color: colors.text }]}>{n.title}</Text>
                <Text style={[styles.notifSub, { color: colors.textSecondary }]}>{n.subtitle}</Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={val => toggleNotification(n.key, val)}
                trackColor={{ true: n.color }}
                thumbColor="#fff"
              />
            </View>

            {enabled && n.key === 'debt_reminder' && (
              <View style={styles.daysRow}>
                <Text style={[styles.daysLabel, { color: colors.textSecondary }]}>Avisar con anticipación:</Text>
                <View style={styles.daysBtns}>
                  {DAYS_OPTIONS.map(d => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => updateDaysBefore(n.key, d)}
                      style={[styles.daysBtn, { backgroundColor: c.days_before === d ? n.color : colors.surfaceAlt, borderColor: n.color }]}
                    >
                      <Text style={[styles.daysBtnText, { color: c.days_before === d ? '#fff' : colors.textSecondary }]}>{d}d</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {enabled && (
              <TouchableOpacity
                onPress={() => testNotification(n.key)}
                style={[styles.testBtn, { backgroundColor: n.color + '15' }]}
              >
                <Ionicons name="play-circle-outline" size={16} color={n.color} />
                <Text style={[styles.testBtnText, { color: n.color }]}>Probar notificación</Text>
              </TouchableOpacity>
            )}
          </Card>
        );
      })}

      <TouchableOpacity
        onPress={handleScheduleAll}
        disabled={scheduling}
        style={[styles.scheduleBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: scheduling ? 0.6 : 1 }]}
      >
        <Ionicons name="alarm" size={20} color={colors.primary} />
        <Text style={[styles.scheduleBtnText, { color: colors.primary }]}>
          {scheduling ? 'Programando...' : 'Reprogramar todas las notificaciones'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  permInfo: { flex: 1 },
  permTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  permSub: { fontSize: FontSize.xs },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  notifIcon: { width: 44, height: 44, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  notifSub: { fontSize: FontSize.xs, marginTop: 2 },
  daysRow: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  daysLabel: { fontSize: FontSize.sm, marginBottom: Spacing.sm },
  daysBtns: { flexDirection: 'row', gap: Spacing.sm },
  daysBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, borderWidth: 1 },
  daysBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  testBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.sm },
  testBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  scheduleBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
});
