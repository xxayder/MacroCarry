import type { ParsedOFFProduct } from '@/types';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';
const USER_AGENT = 'MacroCarry/1.0 (macrocarry-app)';

export async function lookupBarcode(barcode: string): Promise<ParsedOFFProduct> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${BASE_URL}/${barcode}.json`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('Network error');
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      throw new Error('Product not found');
    }

    return parseProduct(data.product);
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchFood(query: string): Promise<ParsedOFFProduct[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) return [];

    const data = await response.json();
    const products = data.products ?? [];

    return products
      .filter((p: any) => p.product_name)
      .map((p: any) => parseProduct(p))
      .slice(0, 15);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function parseProduct(product: any): ParsedOFFProduct {
  const n = product.nutriments ?? {};

  const caloriesPer100g =
    n['energy-kcal_100g'] ??
    n['energy-kcal'] ??
    (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);

  const servingSizeStr: string = product.serving_size ?? '';
  const servingMatch = servingSizeStr.match(/(\d+(?:\.\d+)?)/);
  const servingSize = servingMatch ? parseFloat(servingMatch[1]) : 100;

  return {
    food_name: (product.product_name ?? 'Unknown Product').trim(),
    brand: product.brands ? product.brands.split(',')[0].trim() : null,
    serving_size: servingSize || 100,
    serving_unit: 'g',
    per100g: {
      calories: round(caloriesPer100g),
      protein_g: round(n.proteins_100g ?? 0),
      carbs_g: round(n.carbohydrates_100g ?? 0),
      fat_g: round(n.fat_100g ?? 0),
      fiber_g: round(n.fiber_100g ?? n['fiber-g_100g'] ?? 0),
      sugar_g: round(n.sugars_100g ?? 0),
      sodium_mg: round((n.sodium_100g ?? 0) * 1000),
    },
  };
}

export function calcNutrition(
  per100g: ParsedOFFProduct['per100g'],
  grams: number
) {
  const factor = grams / 100;
  return {
    calories: round(per100g.calories * factor),
    protein_g: round(per100g.protein_g * factor),
    carbs_g: round(per100g.carbs_g * factor),
    fat_g: round(per100g.fat_g * factor),
    fiber_g: round(per100g.fiber_g * factor),
    sugar_g: round(per100g.sugar_g * factor),
    sodium_mg: round(per100g.sodium_mg * factor),
  };
}

export function ozToGrams(oz: number): number {
  return round(oz * 28.3495);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
