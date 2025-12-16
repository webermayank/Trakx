import crypto from "crypto";

export function generateSmsHash(sms: string): string {
    return crypto
        .createHash("sha256")
        .update(sms.trim().toLowerCase())
        .digest("hex");
}
