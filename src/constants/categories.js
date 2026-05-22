export const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Comida', icon: 'restaurant', color: '#F97316' },
  { id: 'transport', name: 'Transporte', icon: 'car', color: '#8B5CF6' },
  { id: 'utilities', name: 'Servicios', icon: 'flash', color: '#3B82F6' },
  { id: 'health', name: 'Salud', icon: 'medkit', color: '#EF4444' },
  { id: 'entertainment', name: 'Entretenimiento', icon: 'game-controller', color: '#EC4899' },
  { id: 'clothing', name: 'Ropa', icon: 'shirt', color: '#14B8A6' },
  { id: 'education', name: 'Educación', icon: 'school', color: '#F59E0B' },
  { id: 'housing', name: 'Vivienda', icon: 'home', color: '#10B981' },
  { id: 'subscriptions', name: 'Suscripciones', icon: 'repeat', color: '#6366F1' },
  { id: 'personal', name: 'Personal', icon: 'person', color: '#A855F7' },
  { id: 'other', name: 'Otros', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

export const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salario', icon: 'briefcase', color: '#10B981' },
  { id: 'freelance', name: 'Freelance', icon: 'laptop', color: '#3B82F6' },
  { id: 'bonus', name: 'Bono', icon: 'gift', color: '#8B5CF6' },
  { id: 'investment_return', name: 'Inversiones', icon: 'trending-up', color: '#F59E0B' },
  { id: 'rental', name: 'Alquiler', icon: 'business', color: '#EC4899' },
  { id: 'side_hustle', name: 'Negocio Extra', icon: 'storefront', color: '#F97316' },
  { id: 'other_income', name: 'Otros Ingresos', icon: 'add-circle', color: '#6B7280' },
];

export const INVESTMENT_TYPES = [
  { id: 'etf', name: 'ETF', icon: 'trending-up', color: '#10B981' },
  { id: 'stock', name: 'Acción', icon: 'bar-chart', color: '#3B82F6' },
  { id: 'crypto', name: 'Crypto', icon: 'logo-bitcoin', color: '#F59E0B' },
  { id: 'savings_account', name: 'Cuenta Ahorro', icon: 'wallet', color: '#8B5CF6' },
  { id: 'real_estate', name: 'Inmueble', icon: 'home', color: '#EC4899' },
  { id: 'bonds', name: 'Bonos', icon: 'document-text', color: '#14B8A6' },
  { id: 'other', name: 'Otro', icon: 'cash', color: '#6B7280' },
];

export const GOAL_ICONS = [
  'airplane', 'car', 'home', 'school', 'medkit', 'gift', 'laptop',
  'phone-portrait', 'tv', 'camera', 'bicycle', 'boat', 'paw',
  'heart', 'star', 'trophy', 'diamond', 'umbrella', 'wallet', 'cash',
];

export const GOAL_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#A855F7',
];

export function getCategoryById(id, type = 'expense') {
  const list = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return list.find(c => c.id === id) || { id, name: id, icon: 'help-circle', color: '#6B7280' };
}

export function getAllCategories() {
  return [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
}
