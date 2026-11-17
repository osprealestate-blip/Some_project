"use client";

/** Opens the browser's print dialog (choose "Save as PDF" there). Before printing it opens every section and shows the
 *  Advanced view so nothing is left out, then puts the page back. No server work and no file is created by us. */
export default function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  const go = () => {
    const root = document.documentElement;
    const prevView = root.getAttribute("data-view");
    const opened: HTMLDetailsElement[] = [];
    document.querySelectorAll("details").forEach((d) => { if (!d.open) { d.open = true; opened.push(d); } });
    root.setAttribute("data-view", "advanced");
    const restore = () => {
      opened.forEach((d) => { d.open = false; });
      if (prevView == null) root.removeAttribute("data-view"); else root.setAttribute("data-view", prevView);
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };
  return (
    <button type="button" onClick={go} data-noprint className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]">
      {label}
    </button>
  );
}
