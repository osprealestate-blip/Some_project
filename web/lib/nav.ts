/** Site navigation, one list for the header, the phone menu and the footer. */
export type NavItem = { href: string; label: string; match?: string[] };

export const MAIN_NAV: NavItem[] = [
  { href: "/map", label: "Explore Map" },
  { href: "/communities", label: "Communities", match: ["/community"] },
  { href: "/buildings", label: "Buildings", match: ["/building"] },
  { href: "/off-plan", label: "Off-plan" },
  { href: "/tools", label: "Property Tools" },
  { href: "/how-it-works", label: "How It Works" },
];

/** The four guided pages from the homepage. Shown in the phone menu and the footer. */
export const INTENT_NAV: NavItem[] = [
  { href: "/buy", label: "Buy" },
  { href: "/invest", label: "Invest" },
  { href: "/own", label: "I own a property" },
  { href: "/rent", label: "Rent" },
];

export function isActive(pathname: string, item: NavItem): boolean {
  const roots = [item.href, ...(item.match ?? [])];
  return roots.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
