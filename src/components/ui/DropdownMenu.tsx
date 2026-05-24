'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu = ({ children }: DropdownMenuProps) => {
  return <div className="relative inline-block text-left">{children}</div>;
};

export const DropdownMenuTrigger = ({ children, asChild = false }: { children: React.ReactNode; asChild?: boolean }) => {
  return <>{children}</>;
};

export const DropdownMenuContent = ({
  children,
  className,
  align = 'end'
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'center';
}) => {
  return (
    <div className={cn(
      'absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50',
      className
    )}>
      <div className="py-1">{children}</div>
    </div>
  );
};

export const DropdownMenuItem = ({
  children,
  onClick,
  disabled = false,
  className
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
};

export const DropdownMenuSeparator = () => {
  return <div className="border-t border-gray-200 my-1" />;
};