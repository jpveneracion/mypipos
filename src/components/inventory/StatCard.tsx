'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(({ title, value, change = 0, changeType = 'neutral', icon, className }, ref) => {
  const trendIcon = React.useMemo(() => {
    switch (changeType) {
      case 'increase': return <TrendingUp className="h-4 w-4" />;
      case 'decrease': return <TrendingDown className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  }, [changeType]);

  const trendColor = React.useMemo(() => {
    switch (changeType) {
      case 'increase': return 'text-success-600 bg-success-50 dark:bg-success-950';
      case 'decrease': return 'text-error-600 bg-error-50 dark:bg-error-950';
      default: return 'text-neutral-600 bg-neutral-100 dark:bg-neutral-800';
    }
  }, [changeType]);

  return (
    <Card
      ref={ref}
      className={cn('hover:shadow-medium hover:scale-105 transition-all duration-300', 'group relative overflow-hidden', className)}
    >
      <CardContent className="p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-secondary-50/50 dark:from-primary-950/50 dark:to-secondary-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">{title}</p>
              <h3 className="text-3xl font-bold text-neutral-900 dark:text-white">{value}</h3>
            </div>

            {icon && (
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-soft">
                {icon}
              </div>
            )}
          </div>

          {change !== 0 && (
            <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium', trendColor)}>
              {trendIcon}
              <span>{Math.abs(change)}%</span>
              <span className="text-neutral-600 dark:text-neutral-400 ml-1">
                {changeType === 'increase' ? 'vs last month' : changeType === 'decrease' ? 'vs last month' : 'no change'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

export { StatCard };
