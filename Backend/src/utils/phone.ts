export const normalizePhone = (input: string, defaultCountry = "91"): string | null => {
  if (!input) return null;
  let digits = String(input).replace(/[\s\-().]/g, "");
  digits = digits.replace(/^00/, "");
  digits = digits.replace(/^\+/, "");
  digits = digits.replace(/^0+/, "");

  if (/^\d{10}$/.test(digits) && /^[6-9]/.test(digits)) {
    return `${defaultCountry}${digits}`;
  }
  if (new RegExp(`^${defaultCountry}\\d{10}$`).test(digits) && /^[6-9]/.test(digits.slice(defaultCountry.length))) {
    return digits;
  }
  return null;
};

export const isValidPhone = (input: string, defaultCountry = "91"): boolean =>
  normalizePhone(input, defaultCountry) !== null;