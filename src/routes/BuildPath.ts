import { Vector3, Ray, Scene, Raycaster } from "three";
import { calculateRefractionDirection, intersectRayPlane } from "./utils";

const DebugThis = true;

export function buildRayCasterPath( 
  scene: Scene, 
  relativeApertureX: number,
  relativeApertureY: number,
  offset: Ray | Vector3 | number = 0,
  startPosition: Vector3, 
  startDirection: Vector3): Vector3[]  {  
  const rays: Ray[] = [];
  const n_air = 1.0;

  const tracePoints: Vector3[] = [];
  const directionCosines: Vector3[] = [];
  const surfaceNormals: Vector3[] = [];

  // find children with name 'optics'
  const opticsInPath = scene.children.filter(
    (c) => c.name === "lens" || c.name === "mirror"
  );

  // 🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨
  if (DebugThis) console.log("🚀 ~ opticsInPath:", opticsInPath);

  if (!opticsInPath) {
    console.log("*** no optics found ***");
    return tracePoints;
  }

  // **** add starting points to arrays **** //
  tracePoints.push(startPosition.clone());
  directionCosines.push(startDirection.clone());

  for (let i = 0; i < opticsInPath.length; i++) {
    if (opticsInPath[i].name === "mirror") {
      // first trace beam to mirror location
      // then reflect
      const raycaster = new Raycaster(
        tracePoints[tracePoints.length - 1].clone(),
        directionCosines[directionCosines.length - 1].clone(),
        0,
        1000
      );
      
      // look for intersections at next optic in path
      // first check for no hits - bail out if no hits

      const hitsOnMirror = raycaster.intersectObject(opticsInPath[i], false);
      // 🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨
      if (DebugThis) {
        console.log("🫨🫨🫨🫨🫨🫨🫨🫨🫨")
        console.log(`🚀 mirror ${i} Side 1 has ${hitsOnMirror.length} hits`);
        console.log("hits side 2", hitsOnMirror);
      }
      tracePoints.push(hitsOnMirror[0].point);
      ;
    }

    if (opticsInPath[i].name === "lens") {
      // ********************************************
      // Side 1 action starts here
      // get index for this optic and
      // start raycaster at last trace point

      const n_glass = opticsInPath[i].userData.Index

      const raycaster = new Raycaster(
        tracePoints[tracePoints.length - 1].clone(),
        directionCosines[directionCosines.length - 1].clone(),
        0,
        1000
      );
      
      // look for intersections at next optic in path
      // first check for no hits - bail out if no hits

      const hitsSide1 = raycaster.intersectObject(opticsInPath[i], false);

      // 🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨
      if (DebugThis) {
        console.log("🫨🫨🫨🫨🫨🫨🫨🫨🫨")
        console.log(`🚀 element ${i} Side 1 has ${hitsSide1.length} hits`);
        console.log("hits side 2", hitsSide1);
      }

      if (hitsSide1.length === 0) {
        console.log("*** no hits Surface 1, Optic ", i, "  ***");
        console.log("trace[-1]", tracePoints[tracePoints.length - 1]);
        return tracePoints;
      } 

      // take first hit point & normal as a general rule
      // if the ray does not strike a surface, then bale out
      //
      // convert normal from optic coords to world coords

      let hitPoint: Vector3;
      let hitNormal: Vector3;
      try {
        hitPoint =
        hitsSide1[0].point === undefined ? new Vector3(0, 0, 0) : hitsSide1[0].point;
        hitNormal = new Vector3(
          hitsSide1[0].normal?.x === undefined ? 0 : hitsSide1[0].normal.x,
          hitsSide1[0].normal?.z === undefined ? 0 : -hitsSide1[0].normal.z,
          hitsSide1[0].normal?.y === undefined ? 0 : hitsSide1[0].normal.y
        );
      } catch (e) {
        console.log("*** error in hit[0].point ***");
        console.log("trace[-1]", tracePoints[tracePoints.length - 1]);
        console.log("hit", hitsSide1);
        return tracePoints;
      }

      // calculate surface normal at intersection point
      // const centerOfCurv = new Vector3(0, 0, ROC + zPosition); // first find center of curvature
      // const normal = target.sub(centerOfCurv).normalize();

      tracePoints.push(hitPoint);
      surfaceNormals.push(hitNormal); // direction 1

      // ********************************************
      // calculate refraction side 1

      let refractedDirSide1 = calculateRefractionDirection(
        directionCosines[directionCosines.length - 1].clone(),
        hitNormal.clone(),
        n_air,
        n_glass
      );
      directionCosines.push(refractedDirSide1); // direction 1

      // ********************************************
      // setup and trace to side 2

      raycaster.set(hitPoint.clone(), refractedDirSide1.clone());
      const hitsSide2 = raycaster.intersectObject(opticsInPath[i], false);

      // 🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨
      if (DebugThis) {
        console.log(`🚀 element ${i} Side 2 has ${hitsSide2.length} hits`);
        console.log("hits side 2", hitsSide2);
      }

      let whichhit = 0;
      hitsSide2.forEach((h, i) => {
        if (h.distance > hitsSide2[whichhit].distance) whichhit = i;
      });
      
      tracePoints.push(hitsSide2[whichhit].point);
      const normalX = hitsSide2[whichhit].normal?.x;
      const normalY = hitsSide2[whichhit].normal?.y;
      const normalZ = hitsSide2[whichhit].normal?.z;

      // there has to be an easier way to do this
      const hitNormal2 = new Vector3(
        normalX === undefined ? 0 : normalX,
        normalZ === undefined ? 0 : -normalZ,
        normalY === undefined ? 0 : normalY
      );

      surfaceNormals.push(hitNormal2); // direction 2

      // ********************************************
      // calculate refraction side 2

      let refractedDirSide2 = calculateRefractionDirection(refractedDirSide1.clone(), hitNormal2.clone(), n_glass, n_air);
      directionCosines.push(refractedDirSide2);
    }
  }

  // ********************************************
  // final step is to trace to image plane if needed

  if (offset) {
    if ( typeof offset === 'number') {
      const lastray = rays[rays.length - 1].clone();
      const extorigin = lastray.origin.addScaledVector(lastray.direction, offset);
      const extdirection = lastray.direction.clone();
      rays.push(new Ray(extorigin, extdirection));
    }
    if (offset instanceof Vector3) {
      //rays.push(new Ray(offset, rays[rays.length - 1].direction.clone()));
      tracePoints.push(offset);
      directionCosines.push(directionCosines[directionCosines.length - 1]);
    }
    if (offset instanceof Ray) {
      const lastray = rays[rays.length - 1].clone();
      const image = intersectRayPlane(lastray.origin, lastray.direction, offset.origin, offset.direction);
      rays.push(new Ray(image[0], lastray.direction.clone()));
    }
  }

  // 🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨
  if (DebugThis) {
    console.log("🫨🫨🫨🫨🫨🫨🫨🫨🫨")
    console.log("🚀~ tracePoints:", tracePoints);
    console.log("🚀~ directionCosines:", directionCosines);
    console.log("🚀~ surfaceNormals:", surfaceNormals);
  }
  return tracePoints;
}

