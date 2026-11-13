import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AR } from "./i18nAr";
import { dirOf, makeT, parseLang, tLegend, translate } from "./i18n";
import { FACILITIES } from "./facilities";
import { GOALS } from "./forYou";
import { LIFE_GROUPS } from "./lifeScore";
import { filterLabel, A_PLACE } from "./mapFilter";
import { METRICS, PALETTES } from "./mapMetrics";
import { THEMES } from "./mapThemes";
import { INTENT_NAV, MAIN_NAV } from "./nav";
import { SOURCES } from "./sources";
import { buildingVerdict } from "./verdict";

const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

describe("i18n", () => {
  it("parses the language and direction", () => {
    expect(parseLang("ar")).toBe("ar");
    expect(parseLang("fr")).toBe("en");
    expect(parseLang(undefined)).toBe("en");
    expect(dirOf("ar")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
  });
  it("fills placeholders after translating, and falls back to English", () => {
    expect(translate("en", "Step {n} of {total}", { n: 1, total: 3 })).toBe("Step 1 of 3");
    expect(translate("ar", "Step {n} of {total}", { n: 1, total: 3 })).toBe("الخطوة 1 من 3");
    expect(translate("ar", "Not in the dictionary {x}", { x: 2 })).toBe("Not in the dictionary 2");
  });
  it("keeps the same placeholders in every Arabic entry", () => {
    for (const [en, ar] of Object.entries(AR)) for (const p of placeholders(ar)) expect(placeholders(en), en).toContain(p);
  });
  it("has an Arabic entry for every literal t(\"...\") in the source", () => {
    const root = join(__dirname, "..");
    const files: string[] = [];
    for (const d of ["components", "app", "lib"]) {
      const walk = (dir: string) => readdirSync(dir, { withFileTypes: true }).forEach((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name) && !/\.test\.|i18nAr/.test(e.name)) files.push(p);
      });
      walk(join(root, d));
    }
    const missing = new Set<string>();
    for (const f of files) {
      for (const m of readFileSync(f, "utf8").matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
        const key = m[1].replace(/\\"/g, '"');
        if (!(key in AR) && !/^(English text)$/.test(key)) missing.add(key);
      }
    }
    expect([...missing]).toEqual([]);
  });
  it("has Arabic for the labels that come from lists and tables", () => {
    const keys = [
      ...FACILITIES.map((f) => f.label), ...Object.values(A_PLACE),
      ...Object.values(METRICS).flatMap((m) => [m.label, m.title]), ...Object.values(PALETTES).map((p) => p.label), ...Object.values(THEMES).map((x) => x.label),
      ...GOALS.flatMap((g) => [g.label, g.hint]), ...MAIN_NAV.map((n) => n.label), ...INTENT_NAV.map((n) => n.label),
      SOURCES.dldSales, SOURCES.dldRents, ...LIFE_GROUPS.map((g) => g.label),
    ];
    expect(keys.filter((k) => !(k in AR))).toEqual([]);
  });
  it("translates the legend frame and keeps numbers", () => {
    const t = makeT("ar");
    expect(tLegend(t, "Under AED 1,000")).toBe("أقل من AED 1,000");
    expect(tLegend(t, "AED 1,000 to AED 1,500")).toBe("من AED 1,000 إلى AED 1,500");
    expect(tLegend(t, "No data")).toBe("لا توجد بيانات");
  });
  it("labels map searches and verdicts in Arabic", () => {
    const t = makeT("ar");
    expect(filterLabel({ type: "near", value: "metro" }, t)).toBe("ضمن 0.8 كم من محطة مترو (بخط مستقيم)");
    const v = buildingVerdict({ psf: 2000, yield: 0.07, sales: 40, communityName: "Dubai Marina", communityPsf: 1500, communityYield: 0.055 }, t)!;
    expect(v.text).toContain("أعلى بنسبة 33%");
    expect(buildingVerdict({ psf: 2000, yield: 0.07, sales: 40, communityName: "X", communityPsf: 1500, communityYield: 0.055 })!.text).toBe("Priced 33% above the X median, with a higher rent return than the area.");
  });
});
