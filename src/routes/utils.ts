import { Ray, Vector2, Vector3, Plane } from "three"
import { LineGeometry } from "three/examples/jsm/Addons.js"

export function genLensShellPoints(Apert: number, R: number, CT: number, dr: number) {
    const pts = []
    const tweak = dr / 10
    for(let r = 0; r < Apert + tweak; r += dr) {
      const z = sagAt(R, 0, r)
      pts.push(new Vector2(r, z))
    }

    const lastz = pts[pts.length - 1].y
    const nextz = lastz + (CT - lastz) / 2
    pts.push(new Vector2(Apert, nextz))

    for(let r = Apert; r >= 0; r -= dr) {
      pts.push(new Vector2(r, CT))
    }
    return pts;
}

export function sagAt(R: number, k: number, r: number) {
  let curvature = 0;
  if (Math.abs(R) > 1e-3) {
    curvature = 1 / R;
  }
  return r * r / (R + Math.sqrt(R * R - (1 + k) * r * r));
// return R - Math.sqrt(R * R - r * r)
}

export function calculateRefractionDirection(
    incidentDirection: Vector3,
    surfaceNormal: Vector3,
    ni: number,
    ns: number
  ): Vector3 {
  
    const cosThetaI = incidentDirection.dot(surfaceNormal);
    const sinThetaI = Math.sqrt(1 - cosThetaI * cosThetaI);  // snells law
    const sinThetaR = (ni / ns) * sinThetaI;  // sine angle of refract.
  
    // Check for total internal reflection
    if (sinThetaR > 1) {
      // Total internal reflection, return the reflected direction
      return incidentDirection.clone().reflect(surfaceNormal).normalize();
    }
  
    const cosThetaR = Math.sqrt(1 - sinThetaR * sinThetaR);  // refracted direction
    const refractedDirection = new Vector3().copy(surfaceNormal).multiplyScalar(-cosThetaI)
      .add(incidentDirection)
      .multiplyScalar(ni / ns)
      .sub(surfaceNormal.clone().multiplyScalar(cosThetaR));
  
    return refractedDirection.normalize();
}

export function intersectRayPlane(p0: Vector3, e0: Vector3, p1: Vector3, n1: Vector3): [Vector3, number] {
    // Calculate the dot product of the direction vector and the plane normal
    // const dot = e0.dot(n1);
    // // Ray is parallel to the plane, no intersection - need to improve error handling
    // if (Math.abs(dot) < Number.EPSILON) {
    //     return [new Vector3(0, 0, -20), 20];
    // }

    // const v = p1.clone().sub(p0);
    // const t = v.dot(n1) / dot;
    // const intersectionPoint = p0.clone().add(e0.clone().multiplyScalar(t));
    // const axialDistance = p0.clone().distanceTo(intersectionPoint);

    let plane = new Plane(n1, -n1.clone().dot(p1))
    let intersectionPoint = new Vector3();
    (new Ray(p0, e0)).intersectPlane(plane, intersectionPoint);
    const axialDistance = p0.clone().distanceTo(intersectionPoint);

    return [intersectionPoint, axialDistance];
}

export function findClosestX(array: THREE.Vector2[], q: number): THREE.Vector2 {
    if (array.length === 0) {
        return new Vector2(0, 0)
    }

    return array.reduce((closest, current) => {
        const closestDistance = Math.abs(closest.x - q);
        const currentDistance = Math.abs(current.x - q);

        return currentDistance < closestDistance ? current : closest;
    });
}

export function genLineSegment(segs: Float32Array | number[]): LineGeometry {
    const geo = new LineGeometry()
    geo.setPositions(segs)
    return geo
}

export function Vect3toFloat32(vpts: Vector3[]): Float32Array {
    const pts: Float32Array = new Float32Array(vpts.length * 3)
    for (let i = 0; i < vpts.length; i++) {
      pts[i * 3] = vpts[i].x
      pts[i * 3 + 1] = vpts[i].y
      pts[i * 3 + 2] = vpts[i].z
    }
    return pts
  }
  
export function pv(p: Vector3, digits = 3) {
  return `V3(${p.x.toFixed(digits)}, ${p.y.toFixed(digits)}, ${p.z.toFixed(digits)})`
}