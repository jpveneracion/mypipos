'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            {children}
          </div>
        </div>
      )}
    </>
  );
};

const DialogContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={cn('p-6', className)}>{children}</div>;
};

const DialogHeader = ({ children }: { children: React.ReactNode }) => {
  return <div className="mb-4">{children}</div>;
};

const DialogTitle = ({ children }: { children: React.ReactNode }) => {
  return <h2 className="text-lg font-semibold">{children}</h2>;
};

export { Dialog, DialogContent, DialogHeader, DialogTitle };