export type PerfCell = { roll: number; obs: number };

export type PerfTable = {
  id: string;
  weight: number;
  conditions: string;
  temps: number[];
  altitudes: number[];
  cells: PerfCell[][];
};

export type WindRules = {
  headwindPct: number;
  headwindPerKt: number;
  tailwindPct: number;
  tailwindPerKt: number;
  tailwindLimitKt: number;
  grassPct: number;
};

export type EnvelopePoint = { weight: number; fwd: number; aft: number };

export type StallTable = {
  unit: string;
  flaps: string[];
  rows: { bank: number; values: number[] }[];
};

export type CalRow = { flaps: string; kias: number; kcas: number };

export type KeySpeeds = {
  vx?: number;
  vy?: number;
  shortFieldLiftoff?: number;
  shortFieldAt50?: number;
  vso?: number;
  vs1?: number;
  vfe10?: number;
  vfeFull?: number;
  vno?: number;
  vne?: number;
  va?: number;
};

export type AircraftData = {
  emptyWeight: number;
  emptyArm: number;
  maxRamp: number;
  maxTakeoff: number;
  maxLanding: number;
  arms: { pilot: number; rear: number; bag1: number; bag2: number; fuel: number };
  fuel: { usableGal: number; lbsPerGal: number };
  startTaxi: { weight: number; moment: number };
  envelopeNormal: EnvelopePoint[];
  envelopeUtility: EnvelopePoint[];
  takeoff: PerfTable[];
  landing: PerfTable[];
  wind: WindRules;
  stall: StallTable;
  calibration: CalRow[];
  speeds?: KeySpeeds;
};

export type Aircraft = {
  id: string;
  tail_number: string;
  name: string | null;
  base_type: "R" | "S";
  data: AircraftData;
  updated_at?: string;
};

const ALTS = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000];
const TEMPS = [0, 10, 20, 30, 40];

function grid(rows: number[][][]): PerfCell[][] {
  return rows.map((r) => r.map(([roll, obs]) => ({ roll: roll!, obs: obs! })));
}

const R_TAKEOFF = grid([
  [[795, 1460], [860, 1570], [925, 1685], [995, 1810], [1065, 1945]],
  [[875, 1605], [940, 1725], [1015, 1860], [1090, 2000], [1170, 2155]],
  [[960, 1770], [1035, 1910], [1115, 2060], [1200, 2220], [1290, 2395]],
  [[1055, 1960], [1140, 2120], [1230, 2295], [1325, 2480], [1425, 2685]],
  [[1165, 2185], [1260, 2365], [1355, 2570], [1460, 2790], [1570, 3030]],
  [[1285, 2445], [1390, 2660], [1500, 2895], [1615, 3155], [1735, 3435]],
  [[1425, 2755], [1540, 3015], [1660, 3300], [1790, 3609], [1925, 3940]],
  [[1580, 3140], [1710, 3450], [1845, 3805], [1990, 4195], [2145, 4630]],
  [[1755, 3615], [1900, 4015], [2055, 4480], [2215, 5005], [2390, 5615]],
]);

const R_LANDING = grid([
  [[545, 1290], [565, 1320], [585, 1350], [605, 1385], [625, 1415]],
  [[565, 1320], [585, 1350], [605, 1385], [625, 1420], [650, 1450]],
  [[585, 1355], [605, 1385], [630, 1420], [650, 1455], [670, 1490]],
  [[605, 1385], [625, 1420], [650, 1455], [670, 1490], [695, 1525]],
  [[630, 1425], [650, 1460], [670, 1495], [695, 1530], [720, 1565]],
  [[650, 1460], [675, 1495], [695, 1535], [720, 1570], [745, 1605]],
  [[675, 1500], [700, 1535], [725, 1575], [750, 1615], [775, 1650]],
  [[700, 1540], [725, 1580], [750, 1620], [775, 1660], [800, 1700]],
  [[725, 1585], [750, 1625], [780, 1665], [805, 1705], [830, 1750]],
]);

// Cessna 172S NAV III POH, Section 5, Figure 5-5 (Sheets 1-3) and Figure 5-11.
const S_TAKEOFF_2550 = grid([
  [[860, 1465], [925, 1575], [995, 1690], [1070, 1810], [1150, 1945]],
  [[940, 1600], [1010, 1720], [1090, 1850], [1170, 1990], [1260, 2135]],
  [[1025, 1755], [1110, 1890], [1195, 2035], [1285, 2190], [1380, 2355]],
  [[1125, 1925], [1215, 2080], [1310, 2240], [1410, 2420], [1515, 2605]],
  [[1235, 2120], [1335, 2295], [1440, 2480], [1550, 2685], [1660, 2880]],
  [[1355, 2345], [1465, 2545], [1585, 2755], [1705, 2975], [1825, 3205]],
  [[1495, 2605], [1615, 2830], [1745, 3075], [1875, 3320], [2010, 3585]],
  [[1645, 2910], [1785, 3170], [1920, 3440], [2065, 3730], [2215, 4045]],
  [[1820, 3265], [1970, 3575], [2120, 3880], [2280, 4225], [2450, 4615]],
]);

const S_TAKEOFF_2400 = grid([
  [[745, 1275], [800, 1370], [860, 1470], [925, 1570], [995, 1685]],
  [[810, 1390], [875, 1495], [940, 1605], [1010, 1720], [1085, 1845]],
  [[885, 1520], [955, 1635], [1030, 1760], [1110, 1890], [1190, 2030]],
  [[970, 1665], [1050, 1795], [1130, 1930], [1215, 2080], [1305, 2230]],
  [[1065, 1830], [1150, 1975], [1240, 2130], [1335, 2295], [1430, 2455]],
  [[1170, 2015], [1265, 2180], [1360, 2355], [1465, 2530], [1570, 2715]],
  [[1285, 2230], [1390, 2410], [1500, 2610], [1610, 2805], [1725, 3015]],
  [[1415, 2470], [1530, 2685], [1650, 2900], [1770, 3125], [1900, 3370]],
  [[1560, 2755], [1690, 3000], [1815, 3240], [1950, 3500], [2095, 3790]],
]);

const S_TAKEOFF_2200 = grid([
  [[610, 1055], [655, 1130], [705, 1205], [760, 1290], [815, 1380]],
  [[665, 1145], [720, 1230], [770, 1315], [830, 1410], [890, 1505]],
  [[725, 1250], [785, 1340], [845, 1435], [905, 1540], [975, 1650]],
  [[795, 1365], [860, 1465], [925, 1570], [995, 1685], [1065, 1805]],
  [[870, 1490], [940, 1605], [1010, 1725], [1090, 1855], [1165, 1975]],
  [[955, 1635], [1030, 1765], [1110, 1900], [1195, 2035], [1275, 2175]],
  [[1050, 1800], [1130, 1940], [1220, 2090], [1310, 2240], [1400, 2395]],
  [[1150, 1985], [1245, 2145], [1340, 2305], [1435, 2475], [1540, 2650]],
  [[1270, 2195], [1370, 2375], [1475, 2555], [1580, 2745], [1695, 2950]],
]);

const S_LANDING_2550 = grid([
  [[545, 1290], [565, 1320], [585, 1350], [605, 1380], [625, 1415]],
  [[565, 1320], [585, 1350], [605, 1385], [625, 1420], [650, 1450]],
  [[585, 1355], [610, 1385], [630, 1420], [650, 1455], [670, 1490]],
  [[610, 1385], [630, 1425], [655, 1460], [675, 1495], [695, 1530]],
  [[630, 1425], [655, 1460], [675, 1495], [700, 1535], [725, 1570]],
  [[655, 1460], [680, 1500], [705, 1535], [725, 1575], [750, 1615]],
  [[680, 1500], [705, 1540], [730, 1580], [755, 1620], [780, 1660]],
  [[705, 1545], [730, 1585], [760, 1625], [785, 1665], [810, 1705]],
  [[735, 1585], [760, 1630], [790, 1670], [815, 1715], [840, 1755]],
]);

// Figure 5-3, most rearward CG, KIAS.
const S_STALL: StallTable = {
  unit: "KIAS",
  flaps: ["Up", "10°", "Full"],
  rows: [
    { bank: 0, values: [48, 42, 40] },
    { bank: 30, values: [52, 45, 43] },
    { bank: 45, values: [62, 54, 52] },
    { bank: 60, values: [76, 70, 65] },
  ],
};

// Figure 5-1 (Sheet 1), normal static source.
const S_CALIBRATION: CalRow[] = [
  ...[[50, 56], [60, 62], [70, 70], [80, 78], [90, 87], [100, 97], [110, 107], [120, 117], [130, 127], [140, 137], [150, 147], [160, 157]].map(
    ([kias, kcas]) => ({ flaps: "Up", kias: kias!, kcas: kcas! }),
  ),
  ...[[40, 51], [50, 57], [60, 63], [70, 71], [80, 80], [90, 89], [100, 99], [110, 109]].map(
    ([kias, kcas]) => ({ flaps: "10°", kias: kias!, kcas: kcas! }),
  ),
  ...[[40, 50], [50, 56], [60, 63], [70, 72], [80, 81], [85, 86]].map(
    ([kias, kcas]) => ({ flaps: "Full", kias: kias!, kcas: kcas! }),
  ),
];

const S_WIND: WindRules = {
  headwindPct: 10,
  headwindPerKt: 9,
  tailwindPct: 10,
  tailwindPerKt: 2,
  tailwindLimitKt: 10,
  grassPct: 15,
};

const S_SPEEDS: KeySpeeds = {
  vx: 62,
  vy: 74,
  shortFieldLiftoff: 51,
  shortFieldAt50: 56,
  vso: 40,
  vs1: 48,
  vfe10: 110,
  vfeFull: 85,
  vno: 129,
  vne: 163,
  va: 105,
};

const STALL: StallTable = {
  unit: "KIAS",
  flaps: ["Up", "10°", "Full"],
  rows: [
    { bank: 0, values: [53, 48, 43] },
    { bank: 20, values: [55, 50, 45] },
    { bank: 40, values: [61, 55, 49] },
    { bank: 60, values: [75, 68, 61] },
  ],
};

const CALIBRATION: CalRow[] = [
  { flaps: "Up", kias: 50, kcas: 56 },
  { flaps: "Up", kias: 60, kcas: 62 },
  { flaps: "Up", kias: 70, kcas: 71 },
  { flaps: "Up", kias: 80, kcas: 80 },
  { flaps: "Up", kias: 90, kcas: 89 },
  { flaps: "Up", kias: 100, kcas: 99 },
  { flaps: "Up", kias: 110, kcas: 109 },
  { flaps: "Up", kias: 120, kcas: 119 },
  { flaps: "Full", kias: 40, kcas: 50 },
  { flaps: "Full", kias: 50, kcas: 56 },
  { flaps: "Full", kias: 60, kcas: 63 },
  { flaps: "Full", kias: 70, kcas: 72 },
  { flaps: "Full", kias: 80, kcas: 81 },
];

const WIND: WindRules = {
  headwindPct: 10,
  headwindPerKt: 9,
  tailwindPct: 10,
  tailwindPerKt: 2,
  tailwindLimitKt: 10,
  grassPct: 15,
};

function envelopeNormal(maxWeight: number): EnvelopePoint[] {
  return [
    { weight: 1500, fwd: 35.0, aft: 47.3 },
    { weight: 1950, fwd: 35.0, aft: 47.3 },
    { weight: maxWeight, fwd: 41.0, aft: 47.3 },
  ];
}

const ENVELOPE_UTILITY: EnvelopePoint[] = [
  { weight: 1500, fwd: 35.0, aft: 40.5 },
  { weight: 1950, fwd: 35.0, aft: 40.5 },
  { weight: 2200, fwd: 37.5, aft: 40.5 },
];

export const TEMPLATES: Record<"R" | "S", { label: string; data: AircraftData }> = {
  R: {
    label: "Cessna 172R",
    data: {
      emptyWeight: 1663,
      emptyArm: 39.4,
      maxRamp: 2457,
      maxTakeoff: 2450,
      maxLanding: 2450,
      arms: { pilot: 37, rear: 73, bag1: 95, bag2: 123, fuel: 48 },
      fuel: { usableGal: 53, lbsPerGal: 6 },
      startTaxi: { weight: -7, moment: -336 },
      envelopeNormal: envelopeNormal(2450),
      envelopeUtility: ENVELOPE_UTILITY,
      takeoff: [
        {
          id: "to-2450",
          weight: 2450,
          conditions:
            "Flaps 10°, full throttle before brake release, paved level dry runway, zero wind. Liftoff 51 KIAS, 50 ft speed 56 KIAS.",
          temps: TEMPS,
          altitudes: ALTS,
          cells: R_TAKEOFF,
        },
      ],
      landing: [
        {
          id: "ldg-2450",
          weight: 2450,
          conditions:
            "Flaps 30°, power off, maximum braking, paved level dry runway, zero wind. Speed at 50 ft 61 KIAS.",
          temps: TEMPS,
          altitudes: ALTS,
          cells: R_LANDING,
        },
      ],
      wind: WIND,
      stall: STALL,
      calibration: CALIBRATION,
    },
  },
  S: {
    label: "Cessna 172S",
    data: {
      emptyWeight: 1691,
      emptyArm: 39.6,
      maxRamp: 2558,
      maxTakeoff: 2550,
      maxLanding: 2550,
      arms: { pilot: 37, rear: 73, bag1: 95, bag2: 123, fuel: 48 },
      fuel: { usableGal: 53, lbsPerGal: 6 },
      startTaxi: { weight: -7, moment: -336 },
      envelopeNormal: envelopeNormal(2550),
      envelopeUtility: ENVELOPE_UTILITY,
      takeoff: [
        {
          id: "to-2550",
          weight: 2550,
          conditions:
            "Flaps 10°, full throttle before brake release, paved level dry runway, zero wind. Liftoff 51 KIAS, 50 ft speed 56 KIAS.",
          temps: TEMPS,
          altitudes: ALTS,
          cells: S_TAKEOFF_2550,
        },
        {
          id: "to-2400",
          weight: 2400,
          conditions:
            "Flaps 10°, full throttle before brake release, paved level dry runway, zero wind. Liftoff 48 KIAS, 50 ft speed 54 KIAS.",
          temps: TEMPS,
          altitudes: ALTS,
          cells: S_TAKEOFF_2400,
        },
        {
          id: "to-2200",
          weight: 2200,
          conditions:
            "Flaps 10°, full throttle before brake release, paved level dry runway, zero wind. Liftoff 44 KIAS, 50 ft speed 50 KIAS.",
          temps: TEMPS,
          altitudes: ALTS,
          cells: S_TAKEOFF_2200,
        },
      ],
      landing: [
        {
          id: "ldg-2550",
          weight: 2550,
          conditions:
            "Flaps FULL, power idle, maximum braking, paved level dry runway, zero wind. Speed at 50 ft 61 KIAS. Dry grass: add 45% of ground roll.",
          temps: TEMPS,
          altitudes: ALTS,
          cells: S_LANDING_2550,
        },
      ],
      wind: S_WIND,
      stall: S_STALL,
      calibration: S_CALIBRATION,
      speeds: S_SPEEDS,
    },
  },
};

export function templateData(type: "R" | "S"): AircraftData {
  return structuredClone(TEMPLATES[type].data);
}

export const DEFAULT_AIRPORTS: { icao: string; name: string; elevation_ft: number }[] = [
  { icao: "CYBW", name: "Calgary / Springbank", elevation_ft: 3940 },
  { icao: "CYYC", name: "Calgary International", elevation_ft: 3557 },
  { icao: "CEG4", name: "Olds / Didsbury", elevation_ft: 3360 },
  { icao: "CYQF", name: "Red Deer Regional", elevation_ft: 2968 },
];