import { Vector3, Ray, Scene, Raycaster, Matrix4, Euler } from "three";
import { calculateRefractionDirection, intersectRayPlane } from "./utils";

class RaycasterWithRay extends Raycaster {
  constructor(ray: Ray, near = 0, far = Infinity) {
      const { origin, direction } = ray;
      super(origin.clone(), direction.clone().normalize(), near, far);
  }
}

// 0 prints nothing, 1 prints some, 2 prints more, 3 prints everything
const DebugLevel = 1;

export function buildRayCasterPath( 
  scene: Scene, 
  relativeApertureX: number,
  relativeApertureY: number,
  offset: Ray | number = 0) {
    
  const rays: Ray[] = [];
  const n_air = 1.0;
  const radius = 8;
  const startZ = -10;

  const surfaceNormals: Vector3[] = [];

  // find children with name 'optics'
  const opticsInPath = scene.children.filter(
    (c) => c.name === "lens" || c.name === "mirror"
  );

  // 🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨
  if (DebugLevel > 0) console.log("🚀 ~ opticsInPath:", opticsInPath);

  if (!opticsInPath) {
    console.log("*** no optics found ***");
    return rays.map(r => r.origin);
  }

  const startPosition = new Vector3(relativeApertureX * radius, relativeApertureY * radius, startZ);
  const startDirection = new Vector3(0, 0, 1);

  // 👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍 
  // **** add starting points to arrays **** //
  rays.push(new Ray(startPosition.clone(), startDirection.clone()));

  for (let i = 0; i < opticsInPath.length; i++) {
    if (opticsInPath[i].name === "mirror") {
      // first trace beam to mirror location
      // then reflect
      const raycaster = new RaycasterWithRay(rays[rays.length - 1], 0, 1000);
      
      // look for intersections at next optic in path
      // first check for no hits - bail out if no hits

      const hitsOnMirror = raycaster.intersectObject(opticsInPath[i], false);
      // console.log("🚀 ~ hitsOnMirror:", hitsOnMirror)
      // 🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨
      if (DebugLevel > 2) {
        console.log("🫨🫨🫨🫨🫨🫨🫨🫨🫨")
        console.log(`🚀 mirror ${i} Side 1 has ${hitsOnMirror.length} hits`);
        console.log("hits side 2", hitsOnMirror);
      }

      // slightly peculiar way to calc surface normal
      // all because cylinder mesh begins life facing up
      const up = opticsInPath[i].up;
      const rotation = opticsInPath[i].rotation;
      const mirrorSrfNormal = calcRotatedNormal(up.clone(), rotation.clone());
      surfaceNormals.push(mirrorSrfNormal);

      // let incident = new Vector3(  -0.211283,   -0.211283,    0.954316 );
      // let reflected = new Vector3( -0.954316,   -0.211283,    0.211283 );
      // const halfway = incident.clone().add(reflected).normalize();
      // const surfaceNormal = incident.clone().cross(halfway).normalize();

      const refdir = calcReflectedDirection(rays[rays.length - 1].direction, mirrorSrfNormal);
      
      // 👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍
      rays.push(new Ray(hitsOnMirror[0].point, refdir));  
    }

    if (opticsInPath[i].name === "lens") {
      // ********************************************
      // Side 1 action starts here
      // get index for this optic and
      // start raycaster at last trace point

      const n_glass = opticsInPath[i].userData.Index
      const raycaster = new RaycasterWithRay(rays[rays.length - 1], 0, 1000);
      
      // look for intersections at next optic in path
      // first check for no hits - bail out if no hits

      const hitsSide1 = raycaster.intersectObject(opticsInPath[i], false);

      // 🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨
      if (DebugLevel > 2) {
        console.log("🫨🫨🫨🫨🫨🫨🫨🫨🫨")
        console.log(`🚀 element ${i} Side 1 has ${hitsSide1.length} hits`);
        console.log("hits side 2", hitsSide1);
      }

      if (hitsSide1.length === 0) {
        console.log("*** no hits Surface 1, Optic ", i, "  ***");
        console.log("last ray", rays[rays.length - 1])
        return rays.map(r => r.origin);
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
        console.log("last ray", rays[rays.length - 1]);
        console.log("hit", hitsSide1);
        return rays.map(r => r.origin);
      }

      // calculate surface normal at intersection point
      // const centerOfCurv = new Vector3(0, 0, ROC + zPosition); // first find center of curvature
      // const normal = target.sub(centerOfCurv).normalize();


      surfaceNormals.push(hitNormal); // direction 1
     
      // ********************************************
      // calculate refraction side 1
      let refractedDirSide1 = calculateRefractionDirection(
        rays[rays.length - 1].direction.clone(),
        hitNormal.clone(),
        n_air,
        n_glass
      );

      // 👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍
      rays.push(new Ray(hitPoint, refractedDirSide1));
      // ********************************************
      // setup and trace to side 2

      raycaster.set(hitPoint.clone(), refractedDirSide1.clone());
      const hitsSide2 = raycaster.intersectObject(opticsInPath[i], false);

      // 🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨
      if (DebugLevel > 2) {
        console.log(`🚀 element ${i} Side 2 has ${hitsSide2.length} hits`);
        console.log("hits side 2", hitsSide2);
      }

      let whichhit = 0;
      hitsSide2.forEach((h, i) => {
        if (h.distance > hitsSide2[whichhit].distance) whichhit = i;
      });
      

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
      // 👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍
      let refractedDirSide2 = calculateRefractionDirection(refractedDirSide1.clone(), hitNormal2.clone(), n_glass, n_air);
      rays.push(new Ray(hitsSide2[whichhit].point, refractedDirSide2));
    }
  }

  // ********************************************
  // final step is to trace to image plane if needed

  if (offset) {
    if ( typeof offset === 'number') {
      const lastray = rays[rays.length - 1].clone();
      const extorigin = lastray.origin.addScaledVector(lastray.direction, offset);
      const extdirection = lastray.direction.clone();
      // 👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍
      rays.push(new Ray(extorigin, extdirection));
    }
    if (offset instanceof Ray) {
      const lastray = rays[rays.length - 1].clone();
      const [image, _] = intersectRayPlane(lastray.origin, lastray.direction, offset.origin, offset.direction);
      rays.push(new Ray(image, lastray.direction.clone()));
      if (DebugLevel > 1) {
        console.log("offset is a ray", offset)
        console.log("🚀 ~ lastray:", lastray)
        console.log("🚀 ~ image:", image)
        console.log("🚀 ~ lastray.direction.clone():", lastray.direction.clone())
      }
    }

  }
  // temp separate rays into dir and orig vector[]
  const t: Vector3[] = [];
  rays.forEach((r, index) => {
    t.push(r.origin);
  });

  // 🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨🫨
  if (DebugLevel > 0) {
    console.log("🫨🫨🫨🫨🫨🫨🫨🫨🫨")
    console.log("🚀~ ray posi:", rays.map(r => r.origin));
    console.log("🚀~ ray dirs:", rays.map(r => r.direction));
    console.log("🚀~ surfaceNormals:", surfaceNormals);
  }
  return rays.map(r => r.origin);
}

function calcRotatedNormal(normal: Vector3, rotation: Euler) {
  const rotationMatrix = new Matrix4().makeRotationFromEuler(
    new Euler(
        rotation.x, 
        rotation.y, 
        rotation.z)
  );
  return normal.clone().applyMatrix4(rotationMatrix);
}

function calcReflectedDirection(incident: Vector3, normal: Vector3) {
  const dot = incident.dot(normal);
  return incident.sub(normal.clone().multiplyScalar(2 * dot));
}