'use client';

import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  className?: string;
}

function DataTable<T extends Record<string, any>>({ data, columns, onRowClick, onSort, sortKey, sortDirection, className }: DataTableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return;
    const newDirection = sortKey === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newDirection);
  };

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    if (sortKey !== column.key) return <ChevronsUpDown className="h-4 w-4 text-neutral-400" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-primary-600" /> : <ChevronDown className="h-4 w-4 text-primary-600" />;
  };

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white',
                  column.sortable && onSort && 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors',
                  column.className
                )}
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center gap-2">{column.header}{getSortIcon(column)}</div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              className={cn(
                'border-b border-neutral-200 dark:border-neutral-700',
                'hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <td key={column.key} className={cn('px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300', column.className)}>
                  {column.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">No data available</p>
        </div>
      )}
    </div>
  );
}

export { DataTable };
