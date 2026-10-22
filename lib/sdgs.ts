/**
 * The 17 UN Sustainable Development Goals: official short names and colors.
 * Colors follow the UN SDG communications guidelines.
 * `ink` is the text color that stays readable on that goal's color.
 */
export interface Sdg {
  n: number;
  name: string;
  color: string;
  ink: string;
}

const DARK = "#17152B";
const LIGHT = "#FFFFFF";

export const SDGS: Sdg[] = [
  { n: 1, name: "No poverty", color: "#E5243B", ink: LIGHT },
  { n: 2, name: "Zero hunger", color: "#DDA63A", ink: DARK },
  { n: 3, name: "Good health and well-being", color: "#4C9F38", ink: LIGHT },
  { n: 4, name: "Quality education", color: "#C5192D", ink: LIGHT },
  { n: 5, name: "Gender equality", color: "#FF3A21", ink: DARK },
  { n: 6, name: "Clean water and sanitation", color: "#26BDE2", ink: DARK },
  { n: 7, name: "Affordable and clean energy", color: "#FCC30B", ink: DARK },
  { n: 8, name: "Decent work and economic growth", color: "#A21942", ink: LIGHT },
  { n: 9, name: "Industry, innovation and infrastructure", color: "#FD6925", ink: DARK },
  { n: 10, name: "Reduced inequalities", color: "#DD1367", ink: LIGHT },
  { n: 11, name: "Sustainable cities and communities", color: "#FD9D24", ink: DARK },
  { n: 12, name: "Responsible consumption and production", color: "#BF8B2E", ink: DARK },
  { n: 13, name: "Climate action", color: "#3F7E44", ink: LIGHT },
  { n: 14, name: "Life below water", color: "#0A97D9", ink: DARK },
  { n: 15, name: "Life on land", color: "#56C02B", ink: DARK },
  { n: 16, name: "Peace, justice and strong institutions", color: "#00689D", ink: LIGHT },
  { n: 17, name: "Partnerships for the goals", color: "#19486A", ink: LIGHT },
];

export function sdg(n: number): Sdg {
  const found = SDGS.find((g) => g.n === n);
  if (!found) throw new Error(`Unknown SDG ${n}`);
  return found;
}
