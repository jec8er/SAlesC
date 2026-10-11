import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export function passwordHash(password: string) {
  if (password.length < 12 || password.length > 512)
    throw Error("Use a password with 12–512 characters");
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function validPasswordHash(hash: string) {
  return /^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash);
}
export function verifyPassword(password: unknown, hash: string) {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 512 ||
    !validPasswordHash(hash)
  )
    return false;
  const [, salt, key] = hash.split(":");
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(key, "hex"));
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
