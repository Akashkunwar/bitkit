/** Degrees the crosshair moves per mouse count. Same DPI on both sides. */
export const AIM_YAW: Record<string, number> = {
  cs2: 0.022,
  valorant: 0.07,
  apex: 0.022,
  overwatch: 0.0066,
  siege: 0.00572958,
}

export function edpi(dpi: number, sensitivity: number): number {
  if (dpi <= 0 || sensitivity <= 0) throw new Error('DPI and sensitivity must be above zero.')
  return dpi * sensitivity
}

/** Centimetres of mouse travel for a full turn. */
export function cmPer360(dpi: number, sensitivity: number, yaw: number): number {
  if (dpi <= 0 || sensitivity <= 0 || yaw <= 0) throw new Error('DPI, sensitivity, and yaw must be above zero.')
  return (2.54 * 360) / (dpi * yaw * sensitivity)
}

/** Sensitivity in the destination game that matches a full turn in the source game. */
export function convertSensitivity(sensitivity: number, fromYaw: number, toYaw: number): number {
  if (sensitivity <= 0 || fromYaw <= 0 || toYaw <= 0) throw new Error('Sensitivity and yaw must be above zero.')
  return (sensitivity * fromYaw) / toYaw
}
