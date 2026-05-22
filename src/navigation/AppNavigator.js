import React, { lazy, Suspense } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { FontSize } from '../constants/theme';

import HomeScreen from '../screens/home/HomeScreen';
import TransactionsScreen from '../screens/transactions/TransactionsScreen';
import AddTransactionScreen from '../screens/transactions/AddTransactionScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SavingsScreen from '../screens/savings/SavingsScreen';
import AddGoalScreen from '../screens/savings/AddGoalScreen';
import GoalDetailScreen from '../screens/savings/GoalDetailScreen';
import EmergencyFundScreen from '../screens/savings/EmergencyFundScreen';
import MoreScreen from '../screens/more/MoreScreen';
import InvestmentsScreen from '../screens/more/InvestmentsScreen';
import AddInvestmentScreen from '../screens/more/AddInvestmentScreen';
import DebtsScreen from '../screens/more/DebtsScreen';
import AddDebtScreen from '../screens/more/AddDebtScreen';
import ProjectionsScreen from '../screens/more/ProjectionsScreen';
const NotificationsScreen = lazy(() => import('../screens/more/NotificationsScreen'));
import ExportScreen from '../screens/more/ExportScreen';
import SettingsScreen from '../screens/more/SettingsScreen';
import BudgetScreen from '../screens/budget/BudgetScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function screenOptions(colors) {
  return {
    headerStyle: { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, elevation: 0, shadowOpacity: 0 },
    headerTitleStyle: { color: colors.text, fontSize: FontSize.lg, fontWeight: '600' },
    headerBackTitleVisible: false,
    headerTintColor: colors.primary,
    cardStyle: { backgroundColor: colors.background },
  };
}

function HomeStack() {
  const { colors } = useApp();
  return (
    <Stack.Navigator screenOptions={screenOptions(colors)}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function TransactionStack() {
  const { colors } = useApp();
  return (
    <Stack.Navigator screenOptions={screenOptions(colors)}>
      <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ title: 'Transacciones' }} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={({ route }) => ({
        title: route.params?.transaction ? 'Editar' : 'Nueva Transacción',
      })} />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  const { colors } = useApp();
  return (
    <Stack.Navigator screenOptions={screenOptions(colors)}>
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reportes' }} />
    </Stack.Navigator>
  );
}

function SavingsStack() {
  const { colors } = useApp();
  return (
    <Stack.Navigator screenOptions={screenOptions(colors)}>
      <Stack.Screen name="Savings" component={SavingsScreen} options={{ title: 'Ahorro' }} />
      <Stack.Screen name="AddGoal" component={AddGoalScreen} options={({ route }) => ({
        title: route.params?.goal ? 'Editar Meta' : 'Nueva Meta',
      })} />
      <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ title: 'Detalle de Meta' }} />
      <Stack.Screen name="EmergencyFund" component={EmergencyFundScreen} options={{ title: 'Fondo de Emergencia' }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  const { colors } = useApp();
  return (
    <Stack.Navigator screenOptions={screenOptions(colors)}>
      <Stack.Screen name="More" component={MoreScreen} options={{ title: 'Más' }} />
      <Stack.Screen name="Investments" component={InvestmentsScreen} options={{ title: 'Inversiones' }} />
      <Stack.Screen name="AddInvestment" component={AddInvestmentScreen} options={({ route }) => ({
        title: route.params?.investment ? 'Editar Inversión' : 'Nueva Inversión',
      })} />
      <Stack.Screen name="Debts" component={DebtsScreen} options={{ title: 'Deudas' }} />
      <Stack.Screen name="AddDebt" component={AddDebtScreen} options={({ route }) => ({
        title: route.params?.debt ? 'Editar Deuda' : 'Nueva Deuda',
      })} />
      <Stack.Screen name="Projections" component={ProjectionsScreen} options={{ title: 'Simulador' }} />
      <Stack.Screen
        name="Notifications"
        options={{ title: 'Notificaciones' }}
      >
        {props => (
          <Suspense fallback={<ActivityIndicator style={{ flex: 1 }} />}>
            <NotificationsScreen {...props} />
          </Suspense>
        )}
      </Stack.Screen>
      <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'Exportar Datos' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configuración' }} />
      <Stack.Screen name="Budget" component={BudgetScreen} options={{ title: 'Presupuesto' }} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { colors } = useApp();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: { fontSize: FontSize.xs, fontWeight: '500', marginBottom: 4 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            HomeTab: focused ? 'home' : 'home-outline',
            TransactionTab: focused ? 'swap-horizontal' : 'swap-horizontal-outline',
            ReportsTab: focused ? 'bar-chart' : 'bar-chart-outline',
            SavingsTab: focused ? 'trophy' : 'trophy-outline',
            MoreTab: focused ? 'grid' : 'grid-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Inicio' }} />
      <Tab.Screen name="TransactionTab" component={TransactionStack} options={{ title: 'Transacciones' }} />
      <Tab.Screen name="ReportsTab" component={ReportsStack} options={{ title: 'Reportes' }} />
      <Tab.Screen name="SavingsTab" component={SavingsStack} options={{ title: 'Ahorro' }} />
      <Tab.Screen name="MoreTab" component={MoreStack} options={{ title: 'Más' }} />
    </Tab.Navigator>
  );
}
