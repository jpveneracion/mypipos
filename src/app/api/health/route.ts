import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/db';

export async function GET() {
  try {
    const health = await healthCheck();

    if (health.status === 'healthy') {
      return NextResponse.json({
        status: 'ok',
        database: health.status,
        details: health.details,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        status: 'error',
        database: health.status,
        details: health.details,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      database: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}