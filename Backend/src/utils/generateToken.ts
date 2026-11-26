import jwt, { SignOptions } from "jsonwebtoken";
import { Role } from "../types/express";

export interface TokenPayload {
  id: string;
  role: Role;
  societyId?: string;
}

export const generateToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, process.env.JWT_SECRET as string, options);
};