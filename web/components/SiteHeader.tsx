import Link from "next/link";
import SearchBox from "./SearchBox";
import CurrencySwitcher from "./CurrencySwitcher";
import { getServerCurrency } from "@/lib/currency";

const NAV = [
  { href: "/community/392", label: "Dubai Marina" },
  { href: "/community/681", label: "JVC" },
  { href: "/community/346", label: "Business Bay" },
  { href: "/tools/fair-price", label: "Fair price" },
  { href: "/tools/rent-increase", label: "Rent increase" },
];

export default async function SiteHeader() {
  const currency = await getServerCurrency();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--panel)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <Link href="/" className="font-semibold whitespace-nowrap">Dubai building intelligence</Link>
        <nav aria-label="Main" className="order-3 flex w-full gap-3 overflow-x-auto text-sm text-[var(--muted)] sm:order-2 sm:w-auto">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-[var(--fg)]">{n.label}</Link>
          ))}
        </nav>
        <div className="order-2 ms-auto flex items-center gap-2">
          <CurrencySwitcher initialCurrency={currency} />
          <div className="w-48 sm:w-60">
            <SearchBox />
          </div>
        </div>
      </div>
    </header>
  );
}
