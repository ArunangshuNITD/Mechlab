import { NextResponse } from 'next/server';
import { calculateBuckling } from '@/lib/buckling';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = calculateBuckling(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}