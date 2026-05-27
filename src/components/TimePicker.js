import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';

function timeStrToDate(timeStr) {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeStr(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDisplay(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function TimePicker({ label, value, onChange, style }) {
  const { colors } = useApp();
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(null);

  const currentDate = timeStrToDate(value);

  function handlePress() {
    setTempDate(currentDate);
    setShow(true);
  }

  function handleChange(event, selectedDate) {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selectedDate) {
        onChange(dateToTimeStr(selectedDate));
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  }

  function handleIOSConfirm() {
    setShow(false);
    if (tempDate) onChange(dateToTimeStr(tempDate));
  }

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={[styles.container, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <TouchableOpacity style={styles.touchable} onPress={handlePress} activeOpacity={0.7}>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.text, { color: colors.text }]}>
            {formatDisplay(value) || '9:00 AM'}
          </Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={currentDate}
          mode="time"
          display="default"
          onChange={handleChange}
          is24Hour={false}
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
                <Text style={[styles.sheetTitle, { color: colors.text }]}>{label || 'Hora'}</Text>
                <TouchableOpacity onPress={handleIOSConfirm}>
                  <Text style={[styles.sheetBtn, { color: colors.primary, fontWeight: '600' }]}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate || currentDate}
                mode="time"
                display="spinner"
                onChange={handleChange}
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
