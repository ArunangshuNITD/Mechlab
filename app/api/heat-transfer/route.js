// app/api/heat-transfer/route.js
import { NextResponse } from 'next/server';
import { calculateCompositeWall } from '@/lib/heat-transfer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { layers, boundaries, area } = body;

    if (!layers || !boundaries) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const results = calculateCompositeWall(layers, boundaries, area);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}