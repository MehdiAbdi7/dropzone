import { describe, expect, it } from "vitest";
import {
  axisTicks,
  donutSegments,
  labelEvery,
  metricValue,
  niceMax,
  percentages,
  relativeDayLabel,
  shortAmount,
  shortDayLabel,
  totalOf,
  type OverviewPoint,
} from "./chartMath";

// Les calculs des graphiques du tableau de bord (20/11), sans écran : échelle, repères, anneau, libellés.
const point = (over: Partial<OverviewPoint> = {}): OverviewPoint => ({ date: "2026-11-20", sales: 0, orders: 0, profit: 0, collected: 0, ...over });

describe("niceMax", () => {
  it("arrondit au 1, 2, 5 ou 10 supérieur de son ordre de grandeur", () => {
    expect(niceMax(300_000)).toBe(500_000);
    expect(niceMax(69_000)).toBe(100_000);
    expect(niceMax(120_000)).toBe(200_000);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(2)).toBe(2);
    expect(niceMax(100_000)).toBe(100_000);
  });

  it("garde une échelle même sans rien à montrer", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(-5)).toBe(1);
  });
});

describe("axisTicks", () => {
  it("quatre intervalles pour de l'argent", () => {
    expect(axisTicks(500_000, false)).toEqual([0, 125_000, 250_000, 375_000, 500_000]);
  });

  it("des repères entiers pour un nombre de commandes", () => {
    expect(axisTicks(2, true)).toEqual([0, 1, 2]);
    expect(axisTicks(1, true)).toEqual([0, 1]);
    expect(axisTicks(10, true)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(axisTicks(20, true)).toEqual([0, 5, 10, 15, 20]);
  });
});

describe("shortAmount", () => {
  it("écrit les grands nombres en k et en M, avec la virgule française", () => {
    expect(shortAmount(0)).toBe("0");
    expect(shortAmount(950)).toBe("950");
    expect(shortAmount(1_000)).toBe("1 k");
    expect(shortAmount(12_500)).toBe("12,5 k");
    expect(shortAmount(250_000)).toBe("250 k");
    expect(shortAmount(1_500_000)).toBe("1,5 M");
    expect(shortAmount(2_000_000)).toBe("2 M");
  });
});

describe("donutSegments", () => {
  it("coupe la circonférence en parts proportionnelles, chacune commençant où finit la précédente", () => {
    expect(donutSegments([1, 1], 100)).toEqual([
      { length: 50, offset: 0 },
      { length: 50, offset: 50 },
    ]);
    expect(donutSegments([3, 1, 0, 4], 80)).toEqual([
      { length: 30, offset: 0 },
      { length: 10, offset: 30 },
      { length: 0, offset: 40 },
      { length: 40, offset: 40 },
    ]);
  });

  it("n'a rien à dessiner quand tout est à zéro", () => {
    expect(donutSegments([0, 0, 0], 100)).toEqual([]);
    expect(donutSegments([], 100)).toEqual([]);
  });
});

describe("percentages", () => {
  it("donne la part de chacun en pourcentage entier", () => {
    expect(percentages([1, 1])).toEqual([50, 50]);
    expect(percentages([1, 3])).toEqual([25, 75]);
    expect(percentages([0, 0])).toEqual([0, 0]);
  });
});

describe("labels des jours", () => {
  it("un repère sur 7 jours, un sur 5 sur 30 jours (le dernier jour toujours nommé)", () => {
    expect(labelEvery(7)).toBe(1);
    expect(labelEvery(30)).toBe(5);
  });

  it("jour de la semaine abrégé et numéro, en français", () => {
    expect(shortDayLabel("2026-11-20")).toBe("ven. 20");
    expect(shortDayLabel("2026-11-16")).toBe("lun. 16");
  });

  it("aujourd'hui et hier, sinon la date courte", () => {
    expect(relativeDayLabel("2026-11-20", "2026-11-20")).toBe("Aujourd'hui");
    expect(relativeDayLabel("2026-11-19", "2026-11-20")).toBe("Hier");
    expect(relativeDayLabel("2026-11-10", "2026-11-20")).toBe("10/11");
    expect(relativeDayLabel("2026-11-30", "2026-12-01")).toBe("Hier");
  });
});

describe("la série et ses totaux", () => {
  const series = [point({ sales: 100, orders: 1, profit: 20, collected: 90 }), point({ sales: 50, orders: 2, profit: 5, collected: 60 })];

  it("lit la valeur d'un point selon la mesure choisie", () => {
    expect(metricValue(series[0], "sales")).toBe(100);
    expect(metricValue(series[0], "orders")).toBe(1);
    expect(metricValue(series[0], "profit")).toBe(20);
    expect(metricValue(series[0], "collected")).toBe(90);
  });

  it("additionne la période", () => {
    expect(totalOf(series, "sales")).toBe(150);
    expect(totalOf(series, "orders")).toBe(3);
    expect(totalOf(series, "profit")).toBe(25);
    expect(totalOf([], "sales")).toBe(0);
  });
});
