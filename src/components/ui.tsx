'use client';

import { ReactNode } from 'react';

// ============================================
// CARD
// ============================================
interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[var(--bg-surface)] 
        border border-[var(--border-subtle)] 
        rounded-xl
        ${hover ? 'hover:bg-[var(--bg-elevated)] hover:border-[var(--border-default)] cursor-pointer transition-all duration-150' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ============================================
// STAT CARD
// ============================================
interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ label, value, subtitle, icon, trend }: StatCardProps) {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-[var(--text-muted)]'
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-meta">{label}</span>
        {icon && <span className="text-xl opacity-60">{icon}</span>}
      </div>
      <div className="text-3xl font-semibold tracking-tight mb-1">{value}</div>
      {subtitle && (
        <div className={`text-xs ${trend ? trendColors[trend] : 'text-[var(--text-muted)]'}`}>
          {subtitle}
        </div>
      )}
    </Card>
  );
}

// ============================================
// BUTTON
// ============================================
interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  onClick, 
  disabled,
  type = 'button'
}: ButtonProps) {
  const variants = {
    primary: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white',
    secondary: 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-default)]',
    ghost: 'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        font-medium rounded-lg
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-ring
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// ============================================
// BADGE / STATUS PILL
// ============================================
interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'accent';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
    success: 'bg-green-500/15 text-green-400',
    warning: 'bg-yellow-500/15 text-yellow-400',
    error: 'bg-red-500/15 text-red-400',
    accent: 'bg-[var(--accent-subtle)] text-[var(--accent)]'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };

  return (
    <span className={`${variants[variant]} ${sizes[size]} rounded-md font-medium inline-flex items-center gap-1`}>
      {children}
    </span>
  );
}

// ============================================
// INPUT
// ============================================
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  icon?: ReactNode;
}

export function Input({ value, onChange, placeholder, type = 'text', className = '', icon }: InputProps) {
  return (
    <div className={`relative ${className}`}>
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full bg-[var(--bg-surface)] 
          border border-[var(--border-subtle)]
          rounded-lg px-4 py-2.5 text-sm
          text-[var(--text-primary)]
          placeholder:text-[var(--text-muted)]
          focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]
          transition-all duration-150
          ${icon ? 'pl-10' : ''}
        `}
      />
    </div>
  );
}

// ============================================
// SECTION HEADER
// ============================================
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-section">{title}</h2>
        {subtitle && <p className="text-meta mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================
interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-4xl mb-4 opacity-40">{icon}</div>
      <h3 className="text-[var(--text-primary)] font-medium mb-1">{title}</h3>
      {description && <p className="text-meta max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============================================
// LIST ROW
// ============================================
interface ListRowProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListRow({ children, onClick, className = '' }: ListRowProps) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-4 p-4
        border-b border-[var(--border-subtle)] last:border-b-0
        ${onClick ? 'hover:bg-[var(--bg-elevated)] cursor-pointer' : ''}
        transition-colors duration-150
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ============================================
// AVATAR
// ============================================
interface AvatarProps {
  emoji?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'busy';
}

export function Avatar({ emoji = '🤖', size = 'md', status }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl'
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    busy: 'bg-yellow-500'
  };

  return (
    <div className="relative">
      <div className={`${sizes[size]} bg-[var(--bg-elevated)] rounded-xl flex items-center justify-center`}>
        {emoji}
      </div>
      {status && (
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColors[status]} rounded-full border-2 border-[var(--bg-surface)]`} />
      )}
    </div>
  );
}

// ============================================
// QUICK ACTION BUTTON
// ============================================
interface QuickActionProps {
  icon: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}

export function QuickAction({ icon, title, subtitle, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="
        flex items-center gap-3 p-4 w-full text-left
        bg-[var(--bg-surface)] border border-[var(--border-subtle)]
        rounded-xl
        hover:bg-[var(--bg-elevated)] hover:border-[var(--border-default)]
        transition-all duration-150
        group
      "
    >
      <div className="w-10 h-10 bg-[var(--bg-elevated)] group-hover:bg-[var(--accent-subtle)] rounded-lg flex items-center justify-center text-xl transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-[var(--text-primary)]">{title}</div>
        {subtitle && <div className="text-xs text-[var(--text-muted)] truncate">{subtitle}</div>}
      </div>
      <svg className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ============================================
// NAV ITEM
// ============================================
interface NavItemProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function NavItem({ icon, label, active = false, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
        transition-all duration-150
        ${active 
          ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' 
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
        }
      `}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}
