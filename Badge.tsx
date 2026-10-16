import { type ReactNode } from 'react';

type Color = 'teal' | 'amber' | 'red' | 'blue' | 'slate' | 'green';

interface BadgeProps {
  color?: Color;
  children: ReactNode;
  className?: string;
}

const colorClasses: Record<Color, string> = {
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  green: 'bg-green-50 text-green-700 border-green-200',
};

export function Badge({ color = 'slate', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClasses[color]} ${className}`}>
      {children}
    </span>
  );
}
