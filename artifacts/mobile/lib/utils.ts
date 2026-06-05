import type { DailyTotals, FoodLog } from '@/types';

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return formatDate(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days);
}

export function isToday(dateStr: string): boolean {
  return dateStr === today();
}

export function formatDisplayDate(dateStr: string): string {
  const d = parseDate(dateStr);
  const t = today();
  const yesterday = subtractDays(t, 1);
  if (dateStr === t) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function calcDailyTotals(logs: FoodLog[]): DailyTotals {
  return logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories ?? 0),
      protein_g: acc.protein_g + (log.protein_g ?? 0),
      carbs_g: acc.carbs_g + (log.carbs_g ?? 0),
      fat_g: acc.fat_g + (log.fat_g ?? 0),
      fiber_g: acc.fiber_g + (log.fiber_g ?? 0),
      sugar_g: acc.sugar_g + (log.sugar_g ?? 0),
      sodium_mg: acc.sodium_mg + (log.sodium_mg ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 }
  );
}

export function calcCarryover(
  pastLogs: { date: string; calories: number }[],
  dailyGoal: number
): number {
  return pastLogs.reduce((acc, day) => acc + (dailyGoal - day.calories), 0);
}

export function mealLabel(meal: string): string {
  const labels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks',
  };
  return labels[meal] ?? meal;
}

export function validateMacros(
  calories: number,
  protein: number,
  carbs: number,
  fat: number
): { valid: boolean; warning: string | null } {
  const macroCalories = protein * 4 + carbs * 4 + fat * 9;
  const diff = Math.abs(macroCalories - calories);
  const threshold = calories * 0.1;
  if (diff > threshold && diff > 50) {
    return {
      valid: false,
      warning: `Macro calories (${Math.round(macroCalories)} kcal) differ from your calorie goal by ${Math.round(diff)} kcal. You can still save.`,
    };
  }
  return { valid: true, warning: null };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function last7Days(): string[] {
  const result: string[] = [];
  for (let i = 6; i >= 0; i--) {
    result.push(subtractDays(today(), i));
  }
  return result;
}

export function last30Days(): string[] {
  const result: string[] = [];
  for (let i = 29; i >= 1; i--) {
    result.push(subtractDays(today(), i));
  }
  return result;
}
