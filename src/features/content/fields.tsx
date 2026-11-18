"use client";
import { cloneElement, useId, type ReactElement } from "react";
export function ContentField({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const generated = useId(),
    id = children.props.id ?? generated;
  return (
    <div className="grid gap-1 text-sm">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {cloneElement(children, { id })}
    </div>
  );
}
export function moveContent<T>(
  items: T[],
  index: number,
  direction: number,
): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
