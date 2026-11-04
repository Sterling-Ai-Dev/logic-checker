import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

export const ANTHROPIC_MODEL = requireEnv("ANTHROPIC_MODEL");
export const PORT = Number(process.env.PORT ?? 3001);
