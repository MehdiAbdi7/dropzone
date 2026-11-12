import { APPLE_AND_DELL } from "./laptops.js";
import { HP_AND_LENOVO } from "./laptopsHpLenovo.js";
import { OTHERS } from "./laptopsOthers.js";
import { PHONES } from "./phones.js";
import { TABLETS } from "./tablets.js";
import type { DeviceRow } from "./types.js";

export const LAPTOPS: DeviceRow[] = [...APPLE_AND_DELL, ...HP_AND_LENOVO, ...OTHERS];

export const DEVICE_GROUPS = [
  { kind: "phone", rows: PHONES },
  { kind: "tablet", rows: TABLETS },
  { kind: "laptop", rows: LAPTOPS },
] as const;
