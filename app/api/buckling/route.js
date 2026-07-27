import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    const scriptPath = path.join(process.cwd(), 'lib', 'python', 'buckling.py');

    // Spawn Python subprocess
    const pythonProcess = spawn('python3', [scriptPath]);

    let resultData = '';
    let errorData = '';

    return new Promise((resolve) => {
      // Send JSON input via stdin
      pythonProcess.stdin.write(JSON.stringify(body));
      pythonProcess.stdin.end();

      pythonProcess.stdout.on('data', (data) => {
        resultData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0 || errorData) {
          resolve(NextResponse.json({ error: errorData || 'Python process error' }, { status: 500 }));
          return;
        }
        try {
          const parsed = JSON.parse(resultData);
          resolve(NextResponse.json(parsed));
        } catch (e) {
          resolve(NextResponse.json({ error: 'Failed to parse solver response' }, { status: 500 }));
        }
      });
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}