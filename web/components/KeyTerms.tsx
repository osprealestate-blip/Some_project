import Term from "./Term";

/** "New to this?" line under the headline figures on building and community pages. */
export default function KeyTerms() {
  return (
    <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
      New to these terms? Tap one for a plain explanation:{" "}
      <Term id="gross-yield" />, <Term id="price-per-sq-ft" />, <Term id="median" />, <Term id="off-plan" />, <Term id="ejari" />,{" "}
      <Term id="service-charge" /> and <Term id="dld" />.
    </p>
  );
}
