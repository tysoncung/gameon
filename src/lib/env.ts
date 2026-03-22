/**
 * Environment config validation.
 * Validates required env vars on startup and provides typed access.
 */

interface EnvConfig {
  MONGODB_URI: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_WHATSAPP_NUMBER: string;
  CRON_SECRET: string | undefined;
  NODE_ENV: string;
}

const REQUIRED_VARS = [
  "MONGODB_URI",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WHATSAPP_NUMBER",
] as const;

const OPTIONAL_VARS = ["CRON_SECRET"] as const;

class EnvValidationError extends Error {
  constructor(missing: string[]) {
    super(
      `Missing required environment variables:\n` +
        missing.map((v) => `  - ${v}`).join("\n") +
        `\n\nCopy .env.local.example to .env.local and fill in the values.`
    );
    this.name = "EnvValidationError";
  }
}

let _validated = false;
let _config: EnvConfig | null = null;

/**
 * Validate all required environment variables are set.
 * Call once on startup. Throws EnvValidationError with details if any are missing.
 */
export function validateEnv(): EnvConfig {
  if (_validated && _config) return _config;

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of OPTIONAL_VARS) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  if (missing.length > 0) {
    throw new EnvValidationError(missing);
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn(
      `⚠️  Optional env vars not set: ${warnings.join(", ")}. Some features may be limited.`
    );
  }

  // Validate formats
  const mongoUri = process.env.MONGODB_URI!;
  if (!mongoUri.startsWith("mongodb://") && !mongoUri.startsWith("mongodb+srv://")) {
    throw new Error(
      "MONGODB_URI must start with mongodb:// or mongodb+srv://"
    );
  }

  const twilioPhone = process.env.TWILIO_WHATSAPP_NUMBER!;
  if (!twilioPhone.startsWith("+")) {
    throw new Error(
      "TWILIO_WHATSAPP_NUMBER must be in E.164 format (e.g. +14155238886)"
    );
  }

  _config = {
    MONGODB_URI: mongoUri,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
    TWILIO_WHATSAPP_NUMBER: twilioPhone,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV || "development",
  };

  _validated = true;
  console.log("✅ Environment validated successfully");

  return _config;
}

/**
 * Get validated env config. Throws if validateEnv() hasn't been called.
 */
export function getEnv(): EnvConfig {
  if (!_config) return validateEnv();
  return _config;
}
