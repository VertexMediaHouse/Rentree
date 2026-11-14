export type UnitKey = "bachelor" | "one" | "two" | "three";

// Approximate CMHC average rents. Static snapshot: refresh from the CMHC Rental Market Survey (periodic, not live).
export const CMHC_RENTS: Record<string, Record<UnitKey, number>> = {
  toronto: { bachelor: 1412, one: 1748, two: 2078, three: 2489 },
  vancouver: { bachelor: 1605, one: 2070, two: 2678, three: 3295 },
  montreal: { bachelor: 890, one: 1092, two: 1364, three: 1647 },
  calgary: { bachelor: 1250, one: 1605, two: 2010, three: 2430 },
  ottawa: { bachelor: 1180, one: 1560, two: 1980, three: 2370 },
  edmonton: { bachelor: 990, one: 1280, two: 1590, three: 1960 },
};

export const CMHC_SOURCE = "CMHC Rental Market Report — Fall 2024";

const ALIASES: Record<string, UnitKey> = {
  studio: "bachelor", bachelor: "bachelor", "0br": "bachelor", "0": "bachelor",
  one: "one", "1br": "one", "1br+den": "one", "1": "one", "1 bed": "one",
  two: "two", "2br": "two", "2br+den": "two", "2": "two", "2 bed": "two",
  three: "three", "3br": "three", "3": "three", "3+": "three", "3 bed+": "three", "3br+": "three",
};

export const normalizeUnitType = (s: string): UnitKey | undefined => ALIASES[s.trim().toLowerCase()];
export const cmhcAverage = (city: string, unit: UnitKey): number | undefined => CMHC_RENTS[city.trim().toLowerCase()]?.[unit];
