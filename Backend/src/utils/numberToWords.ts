const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigits = (n: number): string => {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? ` ${ones[o]}` : "");
};

const threeDigits = (n: number): string => {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = "";
  if (h) out += `${ones[h]} Hundred`;
  if (rest) out += `${out ? " " : ""}${twoDigits(rest)}`;
  return out;
};

const indianChunk = (n: number): string => {
  // n < 100000 (one lakh) -> up to 5 digits grouped as thousands/hundred
  const parts: string[] = [];
  const thousand = Math.floor(n / 1000);
  const hundred = n % 1000;
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ");
};

export const numberToWords = (value: number): string => {
  const negative = value < 0;
  let num = Math.abs(value);

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let words = "";
  if (rupees === 0) {
    words = "Zero";
  } else {
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = rupees % 100000;

    const chunks: string[] = [];
    if (crore) chunks.push(`${indianChunk(crore)} Crore`);
    if (lakh) chunks.push(`${indianChunk(lakh)} Lakh`);
    if (thousand) chunks.push(indianChunk(thousand));
    words = chunks.join(" ");
  }

  let result = `Rupees ${words}`;
  if (paise > 0) result += ` and ${twoDigits(paise)} Paise`;
  result += " Only";
  return negative ? `Minus ${result}` : result;
};

export default numberToWords;