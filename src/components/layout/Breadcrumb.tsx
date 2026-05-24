'use client';

import * as React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(({ items, className }, ref) => {
  const router = useRouter();

  return (
    <nav ref={ref} aria-label="Breadcrumb" className={cn('flex items-center gap-2 text-sm', className)}>
      <button onClick={() => router.push('/')} className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
        <Home className="h-4 w-4" />
      </button>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-neutral-400" />
          {item.href ? (
            <button onClick={() => router.push(item.href!)} className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              {item.label}
            </button>
          ) : (
            <span className="text-neutral-900 dark:text-neutral-100 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
});

Breadcrumb.displayName = 'Breadcrumb';

export { Breadcrumb };
