import { STATUS_LABELS, type ClientStatus } from "@/lib/enums";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-brand-pale rounded-lg shadow-sm p-6 ${className}`}>{children}</div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-brand-dark text-white hover:bg-brand-dark/90",
    secondary: "bg-brand-pale text-brand-dark hover:bg-brand-pale/70",
    danger: "bg-red-700 text-white hover:bg-red-800",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-brand-dark mb-1">
        {label} {required && <span className="text-brand-accent">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-brand-slate/70 mt-1">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-brand-pale bg-white px-3 py-2 text-sm text-brand-slate focus:outline-none focus:ring-2 focus:ring-brand-sage";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function CheckboxField({
  label,
  ...props
}: { label: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-start gap-2 mb-4 text-sm text-brand-slate">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-brand-pale text-brand-dark focus:ring-brand-sage"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

export function StatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span className="inline-block rounded-full bg-brand-pale text-brand-dark text-xs font-medium px-3 py-1">
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-heading text-3xl font-semibold text-brand-dark">{title}</h1>
      {subtitle && <p className="text-brand-slate/80 mt-1">{subtitle}</p>}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-red-700 mt-1">{children}</p>;
}
