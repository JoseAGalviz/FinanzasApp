import React from 'react';
import { Modal as RNModal, View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../constants/theme';
import { Button } from './Button';

export function Modal({ visible, onClose, title, children, scrollable = true, fullHeight = false }) {
  const { colors } = useApp();

  const Content = scrollable ? ScrollView : View;

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
            fullHeight && styles.fullHeight,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {title && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          <Content
            style={styles.content}
            contentContainerStyle={scrollable ? styles.scrollContent : undefined}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </Content>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

export function ConfirmModal({ visible, onClose, onConfirm, title, message, confirmText = 'Eliminar', cancelText = 'Cancelar', dangerous = true }) {
  const { colors } = useApp();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.confirmBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text, marginBottom: Spacing.sm }]}>{title}</Text>
          {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}
          <View style={styles.confirmBtns}>
            <Button title={cancelText} variant="secondary" onPress={onClose} style={styles.confirmBtn} />
            <Button title={confirmText} variant={dangerous ? 'danger' : 'primary'} onPress={onConfirm} style={styles.confirmBtn} />
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    maxHeight: '92%',
    paddingBottom: Spacing.xl,
  },
  fullHeight: { height: '92%' },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  closeBtn: { padding: Spacing.xs },
  content: { flexGrow: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  confirmBox: {
    margin: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  message: { fontSize: FontSize.md, marginBottom: Spacing.lg },
  confirmBtns: { flexDirection: 'row', gap: Spacing.sm },
  confirmBtn: { flex: 1 },
});
