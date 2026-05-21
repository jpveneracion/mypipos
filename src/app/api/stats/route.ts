import { NextRequest, NextResponse } from 'next/server';

// Mock statistics data
const generateStats = (merchantId: string) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    merchant_id: merchantId,
    period: {
      start: new Date(today.setHours(0, 0, 0, 0)).toISOString(),
      end: new Date(today.setHours(23, 59, 59, 999)).toISOString()
    },
    sales: {
      today: {
        total_sales: Math.floor(Math.random() * 50) + 20,
        total_revenue: parseFloat((Math.random() * 500 + 200).toFixed(2)),
        average_order_value: parseFloat((Math.random() * 20 + 10).toFixed(2))
      },
      week: {
        total_sales: Math.floor(Math.random() * 300) + 150,
        total_revenue: parseFloat((Math.random() * 3000 + 1500).toFixed(2)),
        growth_percentage: parseFloat((Math.random() * 20 - 5).toFixed(1))
      },
      month: {
        total_sales: Math.floor(Math.random() * 1000) + 500,
        total_revenue: parseFloat((Math.random() * 10000 + 5000).toFixed(2)),
        growth_percentage: parseFloat((Math.random() * 25 - 5).toFixed(1))
      }
    },
    inventory: {
      total_products: Math.floor(Math.random() * 200) + 100,
      low_stock_items: Math.floor(Math.random() * 10) + 3,
      out_of_stock: Math.floor(Math.random() * 3),
      total_value: parseFloat((Math.random() * 5000 + 2000).toFixed(2))
    },
    customers: {
      total_unique: Math.floor(Math.random() * 500) + 200,
      new_this_week: Math.floor(Math.random() * 20) + 5,
      returning_percentage: parseFloat((Math.random() * 30 + 60).toFixed(1))
    },
    payments: {
      pi_network: {
        count: Math.floor(Math.random() * 40) + 15,
        amount: parseFloat((Math.random() * 400 + 150).toFixed(2)),
        percentage: parseFloat((Math.random() * 20 + 70).toFixed(1))
      },
      other: {
        count: Math.floor(Math.random() * 10) + 5,
        amount: parseFloat((Math.random() * 100 + 50).toFixed(2)),
        percentage: parseFloat((Math.random() * 20 + 10).toFixed(1))
      }
    }
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchant_id') || '123e4567-e89b-12d3-a456-426614174000';
    const period = searchParams.get('period') || 'today';

    const stats = generateStats(merchantId);

    return NextResponse.json({
      success: true,
      stats: stats,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch statistics'
      },
      { status: 500 }
    );
  }
}