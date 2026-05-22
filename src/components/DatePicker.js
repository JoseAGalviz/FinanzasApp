import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';

function isoToDate(iso) {
  if (!iso) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${months[m - 1]} ${y}`;
}

export function DatePicker({ label, value, onChange, optional, placeholder, minimumDate, maximumDate, style }) {
  const { colors } = useApp();
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(null);

  const currentDate = value ? isoToDate(value) : new Date();

  function handlePress() {
    setTempDate(currentDate);
    setShow(true);
  }

  function handleChange(event, selectedDate) {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selectedDate) {
        onChange(dateToISO(selectedDate));
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  }

  function handleIOSConfirm() {
    setShow(false);
    if (tempDate) onChange(dateToISO(tempDate));
  }

  const displayText = formatDisplay(value);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={[styles.container, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <TouchableOpacity style={styles.touchable} onPress={handlePress} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.text, { color: displayText ? colors.text : colors.placeholder }]}>
            {displayText || placeholder || 'Seleccionar fecha'}
          </Text>
        </TouchableOpacity>
        {optional && value && (
          <TouchableOpacity onPress={() => onChange(null)} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={[styles.sheetBtn, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>{label || 'Fecha'}</Text>
                <TouchableOpacity onPress={handleIOSConfirm}>
                  <Text style={[styles.sheetBtn, { color: colors.primary, fontWeight: '600' }]}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate || currentDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.iosPicker}
                locale="es-ES"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, marginBottom: Spacing.xs, fontWeight: '500' },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  touchable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  text: { fontSize: FontSize.md },
  clearBtn: { padding: Spacing.xs },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: FontSize.md, fontWeight: '600' },
  sheetBtn: { fontSize: FontSize.md },
  iosPicker: { height: 200 },
});
