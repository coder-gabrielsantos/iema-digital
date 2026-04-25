'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default: 'bg-[#4F46E5] text-white shadow-sm shadow-indigo-950/10 hover:bg-[#4338CA] active:bg-[#3730A3]',
        destructive: 'bg-red-600 text-white shadow hover:bg-red-700',
        outline: 'border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-indigo-300/90 hover:bg-indigo-50/50',
        secondary: 'bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200/90',
        ghost: 'text-slate-700 hover:bg-indigo-50/70 hover:text-slate-900',
        link: 'text-indigo-700 underline-offset-4 hover:underline',
        success: 'bg-emerald-600 text-white shadow hover:bg-emerald-700',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-11 rounded-md px-3 text-sm',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
