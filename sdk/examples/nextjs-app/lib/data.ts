/**
 * Sample data functions - instrumented with TraceInject
 * 
 * These functions demonstrate manual trace injection. In production,
 * the TraceInject build plugin would inject these calls automatically
 * based on the tracepoint-config.json file.
 */

import { trace } from '../../../dist/runtime.js';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
}

export interface Stats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  categories: string[];
}

// Simulated database
const products: Product[] = [
  { id: 'p1', name: 'Quantum Processor', price: 2499.99, category: 'Hardware', stock: 12 },
  { id: 'p2', name: 'Neural Interface Kit', price: 899.99, category: 'Peripherals', stock: 45 },
  { id: 'p3', name: 'Holographic Display', price: 3299.99, category: 'Displays', stock: 8 },
  { id: 'p4', name: 'Plasma Cooling Unit', price: 449.99, category: 'Hardware', stock: 67 },
  { id: 'p5', name: 'Biometric Scanner', price: 199.99, category: 'Security', stock: 120 },
  { id: 'p6', name: 'Quantum Entanglement Router', price: 7999.99, category: 'Networking', stock: 3 },
];

/**
 * Fetch all products
 */
export async function getProducts(): Promise<Product[]> {
  trace('getProducts-entry', { timestamp: Date.now() });
  
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  const result = products.filter((p) => p.stock > 0);
  
  trace('getProducts-exit', { count: result.length });
  return result;
}

/**
 * Get a single product by ID
 */
export async function getProductById(productId: string): Promise<Product | null> {
  trace('getProductById-entry', { productId });
  
  await new Promise((resolve) => setTimeout(resolve, 50));
  
  const product = products.find((p) => p.id === productId);
  
  trace('getProductById-exit', { productId, found: !!product });
  return product ?? null;
}

/**
 * Calculate stats from products
 */
export async function getStats(): Promise<Stats> {
  trace('getStats-entry', {});
  
  await new Promise((resolve) => setTimeout(resolve, 75));
  
  const allProducts = await getProducts();
  
  const totalValue = allProducts.reduce((sum, p) => sum + p.price * p.stock, 0);
  const lowStockCount = allProducts.filter((p) => p.stock < 10).length;
  const categories = [...new Set(allProducts.map((p) => p.category))];
  
  const stats = {
    totalProducts: allProducts.length,
    totalValue,
    lowStockCount,
    categories,
  };
  
  trace('getStats-exit', { stats });
  return stats;
}

/**
 * Search products by query
 */
export async function searchProducts(query: string): Promise<Product[]> {
  trace('searchProducts-entry', { query });
  
  await new Promise((resolve) => setTimeout(resolve, 80));
  
  const lowerQuery = query.toLowerCase();
  const results = products.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery)
  );
  
  trace('searchProducts-exit', { query, resultCount: results.length });
  return results;
}

/**
 * Update product stock (simulated)
 */
export async function updateStock(productId: string, quantity: number): Promise<boolean> {
  trace('updateStock-entry', { productId, quantity });
  
  await new Promise((resolve) => setTimeout(resolve, 60));
  
  const product = products.find((p) => p.id === productId);
  
  if (!product) {
    trace('updateStock-exit', { productId, success: false, reason: 'not found' });
    return false;
  }
  
  const previousStock = product.stock;
  product.stock = Math.max(0, product.stock + quantity);
  const newStock = product.stock;
  
  trace('updateStock-result', { productId, previousStock, newStock, quantity });
  console.log(`Stock updated: ${previousStock} -> ${newStock}`);
  
  return true;
}
