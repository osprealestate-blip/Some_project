"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BuildingPicker, { type Picked } from "@/components/BuildingPicker";
import { MAX_COMPARE, compareHref } from "@/lib/compare";

/** Adds buildings to the compare list by name. Navigates to /compare?ids=... so the page is shareable. */
export default function ComparePicker({ slugs }: { slugs: string[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Picked | null>(null);
  const full = slugs.length >= MAX_COMPARE;

  if (full) return <p className="text-sm text-[var(--muted)]">You are comparing {MAX_COMPARE} buildings, the most the page shows. Remove one to add another.</p>;
  return (
    <div className="max-w-md">
      <label className="mb-1 block text-sm font-medium">Add a building ({slugs.length} of {MAX_COMPARE})</label>
      <BuildingPicker
        value={picked}
        onChange={(b) => {
          setPicked(b);
          if (b && !slugs.includes(b.slug)) router.push(compareHref([...slugs, b.slug]));
          if (b) setPicked(null);
        }}
      />
    </div>
  );
}
