import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/data';
import { trace } from '../../../../../dist/runtime.js';

/**
 * Search API endpoint - demonstrates tracing of API routes
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';

  trace('api-search-entry', { query });
  
  const results = await searchProducts(query);

  trace('api-search-exit', { query, resultCount: results.length });
  
  return NextResponse.json({
    query,
    results,
    count: results.length,
    timestamp: new Date().toISOString(),
  });
}
