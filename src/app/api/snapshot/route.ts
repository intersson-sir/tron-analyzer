import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const SNAPSHOT_PATH = join(process.cwd(), "data", "snapshot.json");

export async function GET() {
  if (!existsSync(SNAPSHOT_PATH)) {
    return NextResponse.json(
      { error: "Snapshot not found. Run scripts/sync.cjs first." },
      { status: 404 },
    );
  }

  try {
    const raw = readFileSync(SNAPSHOT_PATH, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to read snapshot" }, { status: 500 });
  }
}
