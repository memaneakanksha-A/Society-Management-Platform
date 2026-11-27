export interface RenderResult {
  text: string;
  missing: string[];
}

export const render = (body: string, vars: Record<string, unknown>): RenderResult => {
  const missing: string[] = [];
  const text = body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null || value === "") {
      if (!missing.includes(key)) missing.push(key);
      return "";
    }
    return String(value);
  });
  return { text, missing };
};

export const formatRupees = (n: number): string => {
  const value = Number(n) || 0;
  const fixed = Math.round(value * 100) / 100;
  const [whole, decimals] = String(fixed).split(".");
  let last3 = whole.slice(-3);
  let rest = whole.slice(0, -3);
  if (rest) rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  const formatted = rest ? `${rest},${last3}` : last3;
  return `Rs ${formatted}${decimals ? `.${decimals}` : ""}`;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const formatDate = (input: string | Date): string => {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const buildCloudComponents = (variablesInOrder: string[]): Array<{ type: "body"; parameters: Array<{ type: "text"; text: string }> }> => [
  {
    type: "body",
    parameters: variablesInOrder.map((v) => ({ type: "text" as const, text: v })),
  },
];