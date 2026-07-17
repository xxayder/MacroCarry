export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export type FoodSource = 'open_food_facts' | 'manual' | 'copied';

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  daily_calorie_goal: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fat_goal_g: number;
  fiber_goal_g: number;
  sugar_goal_g: number;
  sodium_goal_mg: number;
  carryover_enabled: boolean;
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  food_name: string;
  brand: string | null;
  barcode: string | null;
  serving_amount: number;
  serving_unit: string;
  grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  source: FoodSource;
  created_at: string;
}

export interface ManualFood {
  id: string;
  user_id: string;
  food_name: string;
  brand: string | null;
  barcode: string | null;
  serving_size: number;
  serving_unit: string;
  calories_per_serving: number;
  protein_g_per_serving: number;
  carbs_g_per_serving: number;
  fat_g_per_serving: number;
  fiber_g_per_serving: number;
  sugar_g_per_serving: number;
  sodium_mg_per_serving: number;
  created_at: string;
}

export interface SharePermission {
  id: string;
  owner_id: string;
  shared_with_email: string;
  created_at: string;
}

export interface DailyTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

export interface ParsedOFFProduct {
  food_name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  per100g: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  };
}

export interface FoodEntry {
  food_name: string;
  brand: string | null;
  barcode: string | null;
  serving_amount: number;
  serving_unit: string;
  grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  source: FoodSource;
}
