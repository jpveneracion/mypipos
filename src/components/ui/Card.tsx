'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card rounded-2xl border border-[#14D3C5]/20 shadow-glass',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

const CardContent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('p-6', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

const CardHeader = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props}>
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

export { Card, CardContent, CardHeader, CardTitle };
