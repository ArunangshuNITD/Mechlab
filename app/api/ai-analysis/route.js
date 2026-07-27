import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req) {
  try {
    const data = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Verify API Key
    if (!apiKey) {
      console.error("[AI Route Error]: GEMINI_API_KEY is missing from environment variables.");
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is missing on the server." }, 
        { status: 500 }
      );
    }

    // Initialize the Google Gen AI client
    const ai = new GoogleGenAI({ apiKey });

    // 2. Validate request payload structure
    const inputs = data?.inputs || {};
    const result = data?.result || {};

    if (!data?.inputs || !data?.result) {
      return NextResponse.json(
        { error: "Invalid request payload: 'inputs' and 'result' objects are required." },
        { status: 400 }
      );
    }

    // 3. Construct engineering prompt
    const prompt = `
You are a Senior Structural Engineer evaluating a column buckling simulation.
Analyze the following parameters and calculation results:

Inputs:
- Applied Axial Load: ${inputs.P_kn ?? 'N/A'} kN
- Unbraced Column Length: ${inputs.L_m ?? 'N/A'} m
- Young's Modulus (E): ${inputs.E_gpa ?? 'N/A'} GPa
- Moment of Inertia (I): ${inputs.I_cm4 ?? 'N/A'} cm^4
- Cross-Section Area (A): ${inputs.A_cm2 ?? 'N/A'} cm^2
- Boundary Condition: ${inputs.condition ?? 'Pinned - Pinned'}

Results:
- Critical Buckling Load (P_cr): ${result.P_cr_kn ?? 'N/A'} kN
- Factor of Safety (FoS): ${result.safety_factor ?? 'N/A'}
- Slenderness Ratio: ${result.slenderness ?? 'N/A'}
- Status: ${result.isBuckled ? 'BUCKLED / UNSAFE' : 'STABLE'}

Please provide a concise 3-part engineering analysis in Markdown:
1. **Safety & Risk Assessment**: Is this column at risk of elastic buckling or yielding?
2. **Design Weaknesses**: What parameter is driving failure (e.g., length, moment of inertia, material)?
3. **Actionable Recommendations**: Give 2-3 specific engineering fixes (e.g., add intermediate bracing, select a larger depth profile, change material).
    `;

    // 4. List of models to try in order of priority
const candidateModels = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite'
];

    let aiText = null;
    let lastErrorDetails = null;

    // 5. Try candidate models sequentially via SDK until one succeeds
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });

        if (response.text) {
          aiText = response.text;
          console.log(`[AI Route Success]: Successfully generated response using model '${modelName}'`);
          break; // Exit loop on first successful generation
        }
      } catch (modelErr) {
        lastErrorDetails = modelErr.message;
        console.warn(`[AI Route Notice]: Model '${modelName}' failed, trying next model. Details:`, modelErr.message);
      }
    }

    // 6. Return response or final error
    if (aiText) {
      return NextResponse.json({ analysis: aiText });
    }

    return NextResponse.json(
      { error: lastErrorDetails || "None of the standard Gemini models were available for this API key." },
      { status: 502 }
    );

  } catch (err) {
    console.error("[AI Route Server Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process AI analysis request." },
      { status: 500 }
    );
  }
}