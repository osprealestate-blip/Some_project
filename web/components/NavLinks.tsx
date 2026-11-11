"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, type NavItem } from "@/lib/nav";

/** Header links with the current section marked (aria-current and an underline, not colour alone). */
export default function NavLinks({ items, onNavigate, className = "", linkClassName = "" }: {
  items: NavItem[]; onNavigate?: () => void; className?: string; linkClassName?: string;
}) {
  const pathname = usePathname();
  return (
    <ul className={className}>
      {items.map((n) => {
        const active = isActive(pathname, n);
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`${linkClassName} ${active ? "font-semibold text-[var(--fg)] underline decoration-2 underline-offset-8" : "text-[var(--muted)] hover:text-[var(--fg)]"}`}
            >
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
