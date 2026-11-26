export const TOKEN_KEY = "sp_token";
export const USER_KEY = "sp_user";

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const fileUrl = (path?: string): string => {
  if (!path) return "";
  const raw = import.meta.env.VITE_API_URL || "";
  const base = raw.replace(/\/api\/?$/, "");
  if (!base) return "";
  return `${base}${path}`;
};