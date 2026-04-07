import { NextResponse } from "next/server";
import { analyzeWallets } from "@/lib/analyzer";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { addresses, depth = 2, minAmount = 0, maxNodes = 150 } = body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: "Addresses are required" },
        { status: 400 },
      );
    }

    for (const addr of addresses) {
      if (!/^T[A-Za-z1-9]{33}$/.test(addr)) {
        return NextResponse.json(
          { error: `Invalid TRON address: ${addr}` },
          { status: 400 },
        );
      }
    }

    const clampedDepth = Math.min(Math.max(depth, 1), 5);
    const clampedMax = Math.min(Math.max(maxNodes, 10), 500);

    const result = await analyzeWallets(
      addresses,
      clampedDepth,
      minAmount,
      clampedMax,
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("Analysis error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
