import { NextResponse } from "next/server";
import { expandNode } from "@/lib/analyzer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, existingNodeIds = [], minAmount = 0 } = body;

    if (!address || !/^T[A-Za-z1-9]{33}$/.test(address)) {
      return NextResponse.json(
        { error: "Valid TRON address required" },
        { status: 400 },
      );
    }

    const result = await expandNode(address, existingNodeIds, minAmount);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Expand failed";
    console.error("Expand error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
