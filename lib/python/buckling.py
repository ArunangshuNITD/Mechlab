import sys
import json
import math

def calculate_buckling(params):
    # Inputs & Unit Conversions
    E = float(params.get('E_gpa', 200)) * 1e9       # GPa to Pa
    I = float(params.get('I_cm4', 1500)) * 1e-8     # cm^4 to m^4
    A = float(params.get('A_cm2', 50)) * 1e-4       # cm^2 to m^2
    L = float(params.get('L_m', 3.0))               # Meters
    P_applied = float(params.get('P_kn', 100)) * 1e3 # kN to N
    condition = params.get('condition', 'pinned_pinned')

    # Effective Length Factor (K)
    k_factors = {
        'pinned_pinned': 1.0,
        'fixed_fixed': 0.5,
        'fixed_pinned': 0.7,
        'fixed_free': 2.0
    }
    K = k_factors.get(condition, 1.0)
    L_e = K * L

    # Core Engineering Equations
    P_cr = (math.pi**2 * E * I) / (L_e**2)           # Critical Buckling Load (N)
    r = math.sqrt(I / A)                              # Radius of Gyration (m)
    slenderness = L_e / r                             # Slenderness Ratio (λ)
    sigma_cr = P_cr / A                               # Critical Stress (Pa)
    safety_factor = P_cr / P_applied if P_applied > 0 else 0
    is_buckled = P_applied >= P_cr

    # Generate Deflection Profile Curve (50 points for visualization)
    curve_points = []
    num_points = 50
    for i in range(num_points + 1):
        x = (i / num_points) * L
        # Buckling shape approximation: y(x) = sin(pi * x / L_e)
        if condition == 'pinned_pinned':
            deflection = math.sin(math.pi * x / L)
        elif condition == 'fixed_fixed':
            deflection = 0.5 * (1 - math.cos(2 * math.pi * x / L))
        elif condition == 'fixed_free':
            deflection = 1 - math.cos((math.pi * x) / (2 * L))
        else:
            deflection = math.sin((math.pi * x) / L)

        curve_points.append({
            "x_ratio": round(x / L, 3),
            "deflection": round(deflection, 4)
        })

    return {
        "P_cr_kn": round(P_cr / 1000, 2),
        "P_applied_kn": round(P_applied / 1000, 2),
        "sigma_cr_mpa": round(sigma_cr / 1e6, 2),
        "slenderness": round(slenderness, 2),
        "radius_of_gyration_mm": round(r * 1000, 2),
        "effective_length_m": round(L_e, 2),
        "K_factor": K,
        "safety_factor": round(safety_factor, 2),
        "is_buckled": is_buckled,
        "curve_points": curve_points
    }

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.stdin.read())
        result = calculate_buckling(input_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))