import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

export function getCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.cookie ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return undefined;
}

export function setCookie(response: Response, name: string, value: string): void {
  // Max-Age only: the benchmark clock can lie in the past, so an absolute Expires would be stale on arrival.
  response.append("Set-Cookie", `${name}=${encodeURIComponent(value)}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax`);
}

export function clearCookie(response: Response, name: string): void {
  response.append("Set-Cookie", `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
}

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
