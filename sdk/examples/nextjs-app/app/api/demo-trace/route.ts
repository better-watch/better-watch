import { NextResponse } from 'next/server';
import { getProducts, getStats, updateStock } from '@/lib/data';
import { trace } from '../../../../../dist/runtime.js';

/**
 * Demo trace endpoint - triggers multiple traced operations
 */
export async function POST() {
  trace('api-demo-entry', { method: 'POST', timestamp: Date.now() });
  
  const startTime = Date.now();

  // Trigger multiple traced operations
  const products = await getProducts();
  const stats = await getStats();

  // Simulate a stock update
  if (products.length > 0) {
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 10) - 5; // -5 to +5
    await updateStock(randomProduct.id, quantity);
  }

  const duration = Date.now() - startTime;

  trace('api-demo-exit', { duration, productCount: products.length });
  
  return NextResponse.json({
    success: true,
    message: 'Demo trace triggered successfully',
    operations: ['getProducts', 'getStats', 'updateStock'],
    productCount: products.length,
    lowStockCount: stats.lowStockCount,
    duration: `${duration}ms`,
  });
}
