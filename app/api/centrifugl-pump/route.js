import { NextResponse } from "next/server";
import { analyzePump } from "@/lib/centrifugal-pump";

export async function POST(req) {
  try {
    const body = await req.json();
    const result = analyzePump(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate pump metrics." },
      { status: 400 }
    );
  }
}