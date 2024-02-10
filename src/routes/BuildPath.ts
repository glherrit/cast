import { Vector3, Scene, Raycaster } from "three";
import { calculateRefractionDirection, intersectRayPlane } from "./utils";

export function buildPath(
  scene: Scene,
  probeHeightX: number,
  probeHeightY: number): [Vector3[], Vector3[]] {  
  const nz = 2.4027858866;
  const nair = 1.0;
  const tracePoints: Vector3[] = [];
  const directionCosines: Vector3[] = [];
  const surfaceNormals: Vector3[] = [];

  // get random integer between 0 and 10
  // get everything set up and zero out arrays
  // set up starting vectors
  let radius = 20;
  while (radius > 10) {
    probeHeightY = Math.floor(Math.random() * 21) - 10;
    probeHeightX = Math.floor(Math.random() * 21) - 10;
    radius = Math.sqrt(probeHeightX ** 2 + probeHeightY ** 2);
  }
  probeHeightY = 5;
  probeHeightX = 5;

  tracePoints.splice(0, tracePoints.length);
  directionCosines.splice(0, directionCosines.length);
  surfaceNormals.splice(0, surfaceNormals.length);
  tracePoints.splice(0, tracePoints.length);
  directionCosines.splice(0, directionCosines.length);

  // normal 0
  // find children with name 'optics'
  const elements = scene.children.filter(
    (c) => c.name === "lens" || c.name === "mirror"
  );
  console.log("🚀 ~ elements:", elements);
  if (!elements) {
    console.log("*** no elements found ***");
    return [tracePoints, directionCosines];
  }
  // setup raycaster starting point and direction
  const startPosition = new Vector3(probeHeightX, probeHeightY, -10);
  const startDirection = new Vector3(0, 0, 1);

  // **** Surface zero is starting point **** //
  tracePoints.push(startPosition);
  directionCosines.push(startDirection);

  for (let i = 0; i < 2; i++) {
    const raycaster = new Raycaster(
      tracePoints[tracePoints.length - 1].clone(),
      directionCosines[directionCosines.length - 1].clone(),
      0,
      1000
    );
    const hit = raycaster.intersectObject(elements[i], false);
    console.log("hits for element", i, elements[i].position.z);
    console.log("hits side 1", hit);
    if (i === 1) {
      console.log("hit", hit);
    }
    // first check for no hits - bail out if no hits
    if (hit.length === 0) {
      console.log("*** no hits Surface 1 ***");
      console.log("trace[-1]", tracePoints[tracePoints.length - 1]);
      return [tracePoints, directionCosines];
    }
    // take first hit point & normal as a general rule
    // if the ray does not strike a surface, then bale out
    //
    // convert normal from optic coords to world coords

    let hitPoint: Vector3;
    let hitNormal: Vector3;
    try {
      hitPoint =
        hit[0].point === undefined ? new Vector3(0, 0, 0) : hit[0].point;
      hitNormal = new Vector3(
        hit[0].normal?.x,
        hit[0].normal?.z === undefined ? 0 : -hit[0].normal.z,
        hit[0].normal?.y
      );
    } catch (e) {
      console.log("*** error in hit[0].point ***");
      console.log("trace[-1]", tracePoints[tracePoints.length - 1]);
      console.log("hit", hit);
      return [tracePoints, directionCosines];
    }

    // calculate surface normal at intersection point
    // const centerOfCurv = new Vector3(0, 0, ROC + zPosition); // first find center of curvature
    // const normal = target.sub(centerOfCurv).normalize();
    tracePoints.push(hitPoint);
    surfaceNormals.push(hitNormal); // direction 1

    // calculate refraction side 1
    let refract1 = calculateRefractionDirection(
      startDirection,
      hitNormal,
      nair,
      nz
    );
    directionCosines.push(refract1); // direction 1
    raycaster.set(hitPoint, refract1);
    const hit2 = raycaster.intersectObject(elements[i], false);
    console.log("hits for element", i, elements[i].position.z);
    console.log("hits side 2", hit2);

    let whichhit = 0;
    hit2.forEach((h, i) => {
      if (h.distance > hit2[whichhit].distance) whichhit = i;
    });
    //let hitm = hit2.reduce((max, obj) => obj.distance > max.distance ? obj : max, hit2[0]);

    tracePoints.push(hit2[whichhit].point);
    const normalX = hit2[whichhit].normal?.x;
    const normalZ = hit2[whichhit].normal?.z;
    const normalY = hit2[whichhit].normal?.y;

    const hitNormal2 = new Vector3(
      normalX === undefined ? 0 : normalX,
      normalZ === undefined ? 0 : -normalZ,
      normalY
    );
    // console.log('test hit21', pv(hitNormal2))
    // const hitNormal2 = new Vector3(0, hit2[whichhit].normal?.z === undefined ? 0 : -hit2[whichhit].normal.z, hit2[whichhit].normal?.y)
    // console.log('test hit22', pv(hitNormal2))

    surfaceNormals.push(hitNormal2); // direction 2

    // calculate refraction side 2 & translate to focal plane
    let refract2 = calculateRefractionDirection(refract1, hitNormal2, nz, nair);
    directionCosines.push(refract2);
  }

  const imagePlane = 35.86; // (taken from oslo)
  let [image, d] = intersectRayPlane(
    tracePoints[tracePoints.length - 1],
    directionCosines[directionCosines.length - 1],
    new Vector3(0, 0, imagePlane),
    new Vector3(0, 0, 1)
  );
  // **** Surface zero is starting point **** //
  tracePoints.push(image);
  directionCosines.push(directionCosines[directionCosines.length - 1]);

  // console.log("🚀 ~ hit:", hit)
  // console.log("🚀 ~ hit:", hit[0])
  // console.log("🚀 ~ hit:", hit[0].point)
  // console.log("🚀 ~ hitPoint:", hitPoint)
  // console.log("🚀 ~ hitNormal:", hitNormal)
  // console.log("🚀 ~ normal:", normal)
  // console.log("🚀 ~ refract1:", refract1)
  // console.log("🚀 ~ hit2:", hit2)
  // console.log("🚀 ~ hit2[]:", hit2[whichhit])
  // console.log("source click")
  // console.log("🚀 ~ image:", image)
  console.log("🚀~ tracePoints:", tracePoints);
  console.log("🚀~ directionCosines:", directionCosines);
  console.log("🚀~ surfaceNormals:", surfaceNormals);
  return [tracePoints, directionCosines];
}