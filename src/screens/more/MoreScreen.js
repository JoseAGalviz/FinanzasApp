import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '../../constants/theme';

const MENU_ITEMS = [
  {
    section: 'Finanzas',
    items: [
      { key: 'Budget', title: 'Presupuesto', subtitle: 'Límites por categoría', icon: 'wallet', color: '#3B82F6' },
      { key: 'Investments', title: 'Inversiones', subtitle: 'Portafolio y rendimientos', icon: 'trending-up', color: '#10B981' },
      { key: 'Debts', title: 'Deudas', subtitle: 'Estrategias de pago', icon: 'card', color: '#EF4444' },
      { key: 'Projections', title: 'Simulador', subtitle: 'Proyecciones y FIRE', icon: 'calculator', color: '#8B5CF6' },
    ],
  },
  {
    section: 'Herramientas',
    items: [
      { key: 'Notifications', title: 'Notificaciones', subtitle: 'Alertas y recordatorios', icon: 'notifications', color: '#F59E0B' },
      { key: 'Export', title: 'Exportar Datos', subtitle: 'CSV, JSON, respaldos', icon: 'share-social', color: '#14B8A6' },
      { key: 'Settings', title: 'Configuración', subtitle: 'Tema, moneda, preferencias', icon: 'settings', color: '#6B7280' },
    ],
  },
];

export default function MoreScreen({ navigation }) {
  const { colors } = useApp();

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      {MENU_ITEMS.map(section => (
        <View key={section.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.section.toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => navigation.navigate(item.key)}
                activeOpacity={0.7}
                style={[
                  styles.item,
                  idx < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <Text style={[styles.version, { color: colors.textTertiary }]}>FinanzasApp v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  itemSub: { fontSize: FontSize.xs, marginTop: 2 },
  version: { fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.xl },
});
