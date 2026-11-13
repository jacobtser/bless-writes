import { readFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "node:process";
import { NextResponse } from "next/server";

export async function GET() {
  const stateDir = join(
    env.USERPROFILE ?? "C:\\Users\\jacob",
    "AppData",
    "Local",
    "BlessBooksTunnel",
  );
  try {
    const url = readFileSync(join(stateDir, "current-url.txt"), "utf8").trim();
    return NextResponse.json({ url }, {
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    });
  } catch {
    return NextResponse.json(
      { url: "https://reynolds-witness-affiliate-pine.trycloudflare.com" },
      { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } },
    );
  }
}
