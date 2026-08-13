import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import type { IssueCategory, PromiseStatus } from '@tgim/shared';

type Tone = 'neutral' | 'good' | 'warn' | 'danger' | 'info';

const statusColor: Record<PromiseStatus, string> = {
  draft: '#f97316',
  published: '#3b82f6',
  adopted: '#3b82f6',
  on_track: '#3b82f6',
  completed: '#10b981',
  delayed: '#f59e0b',
  disputed: '#ef4444',
  deferred: '#64748b',
  rejected: '#b91c1c',
  no_update: '#94a3b8',
};

const categoryColor: Record<IssueCategory, string> = {
  water: '#3b82f6',
  roads: '#eab308',
  garbage: '#10b981',
  health: '#ef4444',
  safety: '#8b5cf6',
  jobs: '#0d9488',
  transport: '#06b6d4',
  housing: '#f97316',
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="meta-line">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || description || actions) && (
        <div className="panel-header">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function MetricCard({ label, value, tone = 'neutral', detail }: { label: string; value: string; tone?: Tone; detail?: string }) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

export function StatusChip({ status }: { status: PromiseStatus | string }) {
  const color = status in statusColor ? statusColor[status as PromiseStatus] : '#64748b';
  return (
    <span className="status-chip" style={{ ['--chip-color' as string]: color }}>
      <Circle size={8} fill="currentColor" />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function CategoryBadge({ category }: { category: IssueCategory | string }) {
  const color = category in categoryColor ? categoryColor[category as IssueCategory] : '#3b82f6';
  return (
    <span className="category-badge" style={{ ['--badge-color' as string]: color }}>
      {category}
    </span>
  );
}

export function Button({ variant = 'secondary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <button {...props} className={`button ${variant} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`select ${props.className ?? ''}`} />;
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filter-bar">{children}</div>;
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="action-bar">{children}</div>;
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty-state">
      <AlertTriangle size={22} />
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

export function EvidenceRow({ label, detail, checked }: { label: string; detail: string; checked: boolean }) {
  return (
    <div className="evidence-row">
      {checked ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

export function Timeline({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={`${item.label}-${item.value}`}>
          <span>{item.value}</span>
          <strong>{item.label}</strong>
        </li>
      ))}
    </ol>
  );
}

export function MiniBar({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: Tone }) {
  return (
    <div className="mini-bar">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className={`bar-track ${tone}`}>
        <i style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
