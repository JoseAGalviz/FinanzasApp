# FinanzasApp — Gestión de Finanzas Personales

Aplicación de finanzas personales construida con React Native + Expo. Funciona completamente sin conexión a internet. Compatible con Expo Go (no requiere build nativo).

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Expo | 54.x | Framework base |
| React Native | 0.81.x | UI nativa |
| React | 19.x | Librería UI |
| expo-sqlite | 16.x | Base de datos local SQLite |
| React Navigation v6 | 6.x | Navegación (tabs + stacks) |
| react-native-gifted-charts | 1.4.x | Gráficos (barras, líneas, torta) |
| expo-notifications | 0.32.x | Notificaciones locales |
| expo-image-picker | 17.x | Fotos de recibos |
| expo-file-system + expo-sharing | — | Exportación CSV/JSON |
| expo-document-picker | 14.x | Importación de backup |
| @react-native-community/datetimepicker | 8.x | Selector de fechas nativo |
| date-fns | 3.x | Utilidades de fechas |
| React Context + useReducer | — | Estado global |

---

## Módulos de la app

### 1. Inicio (Dashboard)
Pantalla principal. Muestra:
- **Patrimonio neto**: inversiones + ahorros + fondo de emergencia − deudas
- **Ingreso promedio** de los últimos 3 meses
- **Resumen mensual**: ingresos, gastos, balance, tasa de ahorro
- **Progreso del presupuesto** del mes actual
- **Últimas 5 transacciones**
- **Metas de ahorro** (primeras 3)
- Navegación entre meses (anterior/siguiente)
- Pull to refresh
- Al cargar, reprograma automáticamente todas las notificaciones

### 2. Transacciones
- Lista de ingresos y gastos filtrada por mes
- Búsqueda por descripción
- Filtros por tipo (ingreso/gasto) y categoría
- Agrupación por día
- Cada transacción muestra: monto, categoría (icono + color), descripción, fecha, moneda
- Tap para editar, long press para eliminar
- Botón `+` para agregar nueva

**Al agregar/editar transacción:**
- Toggle Gasto / Ingreso
- Monto
- Selector de moneda (USD / COP / VES)
- Selector de categoría visual (chips con icono)
- Descripción (opcional)
- Fecha (selector de calendario nativo)
- Toggle recurrente
- Foto del recibo (cámara o galería, solo en gastos)

**Categorías de gastos:** Comida, Transporte, Servicios, Salud, Entretenimiento, Ropa, Educación, Vivienda, Suscripciones, Personal, Otros

**Categorías de ingresos:** Salario, Freelance, Bono, Inversiones, Alquiler, Negocio Extra, Otros Ingresos

### 3. Reportes
Tres pestañas:

- **Resumen**: KPIs del mes (ingresos, gastos, ahorro, tasa de ahorro) con comparativa vs mes anterior. Insights automáticos. Gráfico de barras ingresos vs gastos (6 meses).
- **Gastos**: Gráfico de torta por categoría. Top 5 categorías con barra de progreso vs presupuesto.
- **Tendencias**: Gráfico de líneas evolución del balance. Comparativa detallada vs mes anterior.

### 4. Ahorro

**Metas de ahorro:**
- Crear meta con: nombre, monto objetivo, monto inicial, fecha límite (opcional), icono, color
- Vista detalle de cada meta: progreso, monto faltante, aporte mensual necesario, días restantes
- Agregar contribuciones con monto, nota y fecha (selector de calendario)
- Eliminar contribuciones (long press)
- Cálculo automático de aporte mensual necesario para cumplir la meta a tiempo

**Fondo de emergencia:**
- Configurar gastos mensuales y meses objetivo (1, 3, 6, 9, 12)
- Aportar o retirar fondos
- Indicador visual de progreso (rojo < 60%, amarillo 60−99%, verde ≥ 100%)
- Estado textual: "Fondeado", "Vas bien", "Necesitas más"

### 5. Presupuesto
- Límites de gasto por categoría para el mes seleccionado
- Barra de progreso por categoría (verde → amarillo → rojo al superar 80%)
- Total presupuestado vs gastado
- **Regla 50/30/20**: distribuye automáticamente el presupuesto ingresando el ingreso mensual (50% necesidades, 30% deseos, 20% ahorro)
- Alert visual cuando una categoría supera el 90%

### 6. Inversiones
- Portafolio: valor total, monto invertido, ganancia/pérdida total
- Gráfico de torta por tipo de activo
- Lista de inversiones con rendimiento individual (% y monto)
- Tipos de inversión: ETF, Acción, Crypto, Cuenta Ahorro, Inmueble, Bonos, Otro

**Al agregar/editar inversión:**
- Nombre del activo
- Tipo (selector visual)
- Monto invertido
- Valor actual
- Fecha de compra (selector de calendario)
- Notas
- Preview de rendimiento en tiempo real

### 7. Deudas
- Lista de deudas con monto restante, tasa de interés y progreso de pago
- Registrar pagos con monto, fecha y nota
- Historial de pagos por deuda
- Comparativa de estrategias: **Avalanche** (mayor tasa primero) vs **Snowball** (menor saldo primero)
- Proyección de meses para liquidar cada deuda

**Al agregar deuda:**
- Nombre
- Monto total y restante
- Tasa de interés anual
- Pago mínimo mensual
- Fecha de vencimiento (selector de calendario, opcional)

### 8. Proyecciones
- **Interés compuesto**: simula crecimiento de inversión con aporte mensual y tasa anual. Gráfico de líneas con balance total vs capital invertido.
- **Calculadora FIRE**: meses para independencia financiera basado en gastos anuales, ahorros actuales, aporte mensual y rendimiento esperado.
- **Simulador de deuda**: proyección de pago anticipado. Muestra meses y intereses ahorrados al agregar pago extra mensual.

### 9. Notificaciones
Cuatro tipos de alertas locales:

| Tipo | Disparador |
|------|-----------|
| Alerta de Presupuesto | Categoría supera 80% del límite mensual |
| Recordatorio de Meta | Sin aportes a una meta en los últimos 7 días |
| Recordatorio de Deuda | X días antes del vencimiento |
| Fondo de Emergencia | Fondo por debajo del 100% del objetivo |

- Cada tipo se puede habilitar/deshabilitar individualmente
- La deuda permite configurar días de anticipación (1, 3 o 7 días)
- Botón "Probar notificación" envía una notificación de prueba inmediata
- Botón "Reprogramar todas" reprograma manualmente

### 10. Exportación / Importación
- **Exportar CSV**: tabla de transacciones con columnas: fecha, tipo, categoría, descripción, monto, moneda, recurrente
- **Exportar JSON**: backup completo de todas las tablas (transacciones, metas, deudas, inversiones, fondo de emergencia, presupuestos)
- **Importar JSON**: restaura datos desde un backup previo (combina, no sobreescribe)

### 11. Configuración
- **Tema**: Claro / Oscuro / Sistema (auto-detecta preferencia del dispositivo)
- **Moneda predeterminada**: USD ($), COP (COP$), VES (Bs.)
- **Borrar todos los datos**: elimina transacciones, metas, deudas, inversiones y presupuestos (confirma antes de ejecutar)

---

## Multi-moneda

La app soporta **3 monedas**: USD, COP y VES.

- Cada transacción almacena su propia moneda
- Todos los reportes, presupuestos y totales filtran por la moneda seleccionada en ajustes
- El símbolo se muestra por transacción (no se convierte entre monedas)
- La moneda predeterminada se puede cambiar en Ajustes sin afectar transacciones existentes

---

## Base de datos

SQLite local. Archivo: `finance.db`. Modo WAL activado para mejor rendimiento.

### Tablas

| Tabla | Descripción | Campos clave |
|-------|-------------|-------------|
| `transactions` | Ingresos y gastos | `type`, `amount`, `category`, `date`, `currency`, `is_recurring`, `receipt_uri` |
| `budgets` | Límites por categoría/mes | `category_id`, `month`, `year`, `limit_amount` |
| `savings_goals` | Metas de ahorro | `name`, `target_amount`, `current_amount`, `deadline`, `icon`, `color` |
| `savings_contributions` | Aportes a metas | `goal_id`, `amount`, `date`, `note` |
| `debts` | Deudas activas | `name`, `total_amount`, `remaining_amount`, `interest_rate`, `minimum_payment`, `due_date` |
| `debt_payments` | Pagos de deuda | `debt_id`, `amount`, `date`, `note` |
| `emergency_fund` | Fondo de emergencia | `target_months`, `monthly_expenses`, `current_amount` |
| `investments` | Portafolio de inversiones | `name`, `type`, `invested_amount`, `current_value`, `purchase_date` |
| `notifications_config` | Configuración de alertas | `type`, `enabled`, `time`, `days_before` |
| `settings` | Preferencias de la app | `key`, `value` (tema, moneda) |
| `db_migrations` | Control de versión del schema | `version` |

### Migraciones
- v1: Marcador inicial
- v2: Columna `currency` en `transactions`

### Primer arranque
La app inicia con **base de datos vacía**. Solo se insertan:
- Configuración por defecto de las 4 notificaciones (todas habilitadas)
- Ajuste de tema (`system`) y moneda (`$`)

---

## Navegación

```
Bottom Tab Navigator
├── Inicio          → HomeScreen
├── Transacciones   → TransactionsScreen
│                        └── AddTransactionScreen (modal stack)
├── Reportes        → ReportsScreen
├── Ahorro          → SavingsScreen
│                        ├── GoalDetailScreen
│                        ├── AddGoalScreen
│                        └── EmergencyFundScreen
└── Más             → MoreScreen
                         ├── InvestmentsScreen → AddInvestmentScreen
                         ├── DebtsScreen       → AddDebtScreen
                         ├── BudgetScreen
                         ├── ProjectionsScreen
                         ├── NotificationsScreen
                         ├── ExportScreen
                         └── SettingsScreen
```

---

## Estructura del proyecto

```
FinanceApp/
├── App.js                          # Entry point: init DB, navegación raíz, supresión de warnings
├── app.json                        # Config Expo: permisos, plugins
├── babel.config.js                 # Config Babel (plugin reanimated)
├── package.json
└── src/
    ├── constants/
    │   ├── colors.js               # Paletas light y dark
    │   ├── categories.js           # Categorías de gastos, ingresos, inversiones, metas
    │   └── theme.js                # Spacing, FontSize, BorderRadius, Shadow, CURRENCY_SYMBOLS
    ├── database/
    │   └── db.js                   # Apertura SQLite, CREATE TABLE, migraciones, seedDefaults, clearAllData
    ├── context/
    │   └── AppContext.js           # Estado global: tema, moneda, mes seleccionado, currencyCode derivado
    ├── hooks/
    │   ├── useTransactions.js      # CRUD transacciones + getMonthSummary, getCategoryBreakdown, getMonthlyTotals, getAverageIncome
    │   ├── useBudget.js            # CRUD presupuestos + regla 50/30/20 + getOverBudgetCategories
    │   ├── useSavings.js           # CRUD metas + contribuciones + getGoalWithProgress
    │   ├── useDebts.js             # CRUD deudas + pagos + getTotalDebt
    │   ├── useInvestments.js       # CRUD inversiones + getPortfolioSummary
    │   ├── useEmergencyFund.js     # CRUD fondo de emergencia (fetchFund, updateConfig, addContribution, withdraw)
    │   └── useNotifications.js     # Programación de notificaciones locales (import dinámico de expo-notifications)
    ├── utils/
    │   ├── formatCurrency.js       # formatCurrency(amount, symbol), formatPercent
    │   ├── formatDate.js           # formatDate, formatMonthYear, prevMonth, nextMonth, daysUntil, todayISO
    │   ├── calculations.js         # calculateDebtPayoff, calculateCompoundInterest, calculateFIRE, calculate502030, calculateMonthlySavingsNeeded
    │   └── exportData.js           # exportToCSV, exportToJSON, importFromJSON
    ├── components/
    │   ├── Button.js               # Variantes: primary, secondary, outline, danger
    │   ├── Card.js                 # Contenedor con superficie y sombra
    │   ├── DatePicker.js           # Selector de fecha nativo (modal iOS, dialog Android)
    │   ├── EmptyState.js           # Pantalla vacía con icono y mensaje
    │   ├── Input.js                # Input, AmountInput (teclado numérico)
    │   ├── Modal.js                # Modal base + ConfirmModal
    │   ├── ProgressBar.js          # Barra de progreso con porcentaje opcional
    │   └── TransactionItem.js      # Item de transacción (usa moneda propia de la transacción)
    ├── navigation/
    │   └── AppNavigator.js         # BottomTabNavigator + stacks anidados
    └── screens/
        ├── home/HomeScreen.js
        ├── transactions/
        │   ├── TransactionsScreen.js
        │   └── AddTransactionScreen.js
        ├── reports/ReportsScreen.js
        ├── savings/
        │   ├── SavingsScreen.js
        │   ├── GoalDetailScreen.js
        │   ├── AddGoalScreen.js
        │   └── EmergencyFundScreen.js
        ├── budget/BudgetScreen.js
        └── more/
            ├── MoreScreen.js
            ├── InvestmentsScreen.js
            ├── AddInvestmentScreen.js
            ├── DebtsScreen.js
            ├── AddDebtScreen.js
            ├── ProjectionsScreen.js
            ├── NotificationsScreen.js
            ├── ExportScreen.js
            └── SettingsScreen.js
```

---

## Instalación y ejecución

### Requisitos

- Node.js 18+
- Expo Go instalado en el teléfono ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Setup

```bash
cd FinanceApp
npm install
npx expo start
```

Escanear el QR con:
- **iOS**: app de Cámara → tocar el enlace
- **Android**: Expo Go → escanear QR

### Scripts disponibles

```bash
npm start          # Inicia en modo Expo Go
npm run android    # Abre directamente en emulador Android
npm run ios        # Abre directamente en simulador iOS
npm run web        # Versión web (experimental)
```

---

## Características técnicas

- **Offline first**: todos los datos en SQLite local, sin servidores ni API
- **Tema claro/oscuro**: detecta preferencia del sistema, con override manual
- **Multimoneda por transacción**: USD, COP, VES; cada registro guarda su propia moneda
- **Navegación entre meses**: todos los reportes y presupuestos respetan el mes seleccionado globalmente
- **Pull to refresh**: en todas las pantallas de lista
- **Notificaciones dinámicas**: import de `expo-notifications` diferido para evitar warnings en Expo Go
- **DatePicker nativo**: modal en iOS (spinner), dialog en Android
- **Selector de calendario**: reemplaza inputs de texto en todas las fechas
- **Foto de recibo**: adjunta imagen de cámara o galería a cualquier gasto
- **Regla 50/30/20**: distribuye presupuesto en un tap desde el ingreso mensual
- **Estrategias de deuda**: Avalanche (mayor tasa primero) y Snowball (menor saldo primero), con proyección de meses e intereses
- **FIRE**: calcula meses hasta independencia financiera (regla del 4%)
- **Export/Import**: CSV para hojas de cálculo, JSON para backup completo restaurable

---

## Solución de problemas

**Gráficos no aparecen:**
```bash
npx expo install react-native-svg expo-linear-gradient
```

**Notificaciones no funcionan en Android:**
Las notificaciones locales funcionan en builds de desarrollo (`eas build`). En Expo Go, pueden mostrar un warning sobre push notifications que está suprimido en la app. Las notificaciones locales (sin push) sí funcionan en dispositivo físico con Expo Go.

**Error de SQLite al arrancar:**
Desinstalar la app del dispositivo y volver a instalar para resetear la base de datos.

**Import no funciona:**
Solo se aceptan archivos `.json` exportados por esta misma app.

**Advertencia `expo-notifications` en terminal:**
Es un warning de Expo Go SDK 53/54 por inicialización del módulo nativo. No afecta el funcionamiento. Está suprimido a nivel de `LogBox` y `console`.
