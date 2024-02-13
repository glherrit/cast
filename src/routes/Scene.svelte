<script lang="ts">
  import { T, useThrelte } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { Line2 } from "three/examples/jsm/lines/Line2.js";
  import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
  import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
  import {
    Raycaster,
    Scene,
    Vector3,
    Ray,
    Vector2,
    type Intersection,
    PerspectiveCamera,
    DoubleSide,
    LatheGeometry,
    Object3D,
    type Object3DEventMap,
    ConstantColorFactor,
    MeshPhongMaterial,
    Mesh,
    Group,
  } from "three";
  import { onMount } from "svelte";
  import { interactivity } from "@threlte/extras";
  import { DEG2RAD } from "three/src/math/MathUtils.js";
  import {
    Vect3toFloat32,
    calculateRefractionDirection,
    findClosestX,
    genLensShellPts,
    genLineSegment,
    intersectRayPlane,
    pv,
    sagAt,
  } from "./utils";
  import { buildRayCasterPath } from "./BuildRCPath";

  interactivity();
  const centerLine: Float32Array = new Float32Array([
    0, 0, 0, 0, 0, 50, -5.206, 0, 50,
  ]);
  const Mnorm: Float32Array = new Float32Array([0, 0, 0, 0, 5, 0]);
  const { scene, camera } = useThrelte();

  onMount(async () => {
    const h = await getDataFromScene(scene);
  });

  async function getDataFromScene(scene: Scene) {
    //console.log("🚀 ~ start script")
    //console.log("🚀 ~ camera:", $camera)
    const elements = scene.children.filter((c) => c.name === "optics");
    //console.log("🚀 ~ elements:", elements)
    if (!elements) return [];
    const ray = new Ray(new Vector3(0, 0, 0), new Vector3(0, 0, 1));
    const raycaster = new Raycaster(
      ray.origin.clone(),
      ray.direction.clone(),
      0,
      100
    );
    //raycaster.setFromCamera(new Vector2(0, 0), $camera)
    //raycaster.set(ray.origin, ray.direction)
    const hit = raycaster.intersectObjects(scene.children, false);
    //console.log(raycaster)
    //console.log("🚀 ~ hit:", hit)
    return hit;
  }

  function removeDuplicates(array: Intersection<Object3D<Object3DEventMap>>[]) {
    return array.filter((item, index) => {
      return array.findIndex((x) => x.distance === item.distance) === index;
    });
  }

  function sourceClick() {
    let radius = 3;
    while (radius > 1) {
      probeHeightY = Math.random() * 2 - 1;
      probeHeightX = Math.random() * 2 - 1;
      radius = Math.sqrt(probeHeightX ** 2 + probeHeightY ** 2);
    }
    // console.log("🧨 ~ probeHeightX:", probeHeightX);
    // console.log("🧨 ~ probeHeightY:", probeHeightY);
    // probeHeightX = 0;
    // probeHeightY = 0;

    const image: Ray = new Ray(
      new Vector3(-5.206, 0, 50),
      new Vector3(-1, 0, 0)
    );
    tracePoints = buildRayCasterPath(scene, probeHeightX, probeHeightY, image);
  }

  let tracePoints: Vector3[] = [];
  let directionCosines: Vector3[] = [];

  if (tracePoints.length > 0) {
    console.log("🚀 ~ tracePoints:", tracePoints);
    console.log("🚀 ~ directionCosines:", directionCosines);
  }

  let probeHeightY = 5;
  let probeHeightX = 5;
  const radiusOfCurvature = 100;
  const conicConstant = 0;
  const zPosition = 10;
  const Aperture = 12.5;
  const CenterThickness = 3;
  const latheSegs = 51; // number of y segements for the lens
  const ApertureSteps = 1 / (latheSegs - 1); // number of steps in sag calculation

  const lensProps = {
    ROC: radiusOfCurvature,
    Index: 2.4027858866,
  };

  const lensTwo = genLensShellPts(
    Aperture,
    radiusOfCurvature,
    conicConstant,
    CenterThickness,
    ApertureSteps
  );
  let lens2 = new LatheGeometry(lensTwo, latheSegs, 0, Math.PI * 2);
  //console.log("🚀 ~ lensTwo:", lensTwo)
  // let geo = new LatheGeometry(lensTwo, 51, 0, Math.PI * 2);
  // let matl = new MeshPhongMaterial({
  //   color: "yellow",
  //   opacity: 0.8,
  //   transparent: true,
  //   side: 2,
  // });
  // var mesh = new Mesh(geo, matl);
  // mesh.position.set(0, -20, 0);
  // mesh.rotation.set(90 * DEG2RAD, 0, 0);
  // mesh.name = "mirror";
  // mesh.userData = lensProps;
</script>

<T.PerspectiveCamera makeDefault position={[-100, 0, 0]} fov={50}>
  <OrbitControls enableZoom={true} enableDamping target={[0, 0, 6]} />
</T.PerspectiveCamera>

<T.DirectionalLight intensity={0.8} position={[-40, 10, 0]} />
<T.AmbientLight intensity={0.4} />

<T.Mesh
  position={[0, -30, 3]}
  rotate={[0, 90 * DEG2RAD, 0]}
  name={"optics"}
  visible={true}
>
  <T.BoxGeometry args={[3, 3, 3]} />
  <T.MeshStandardMaterial color={"red"} side={DoubleSide} />
</T.Mesh>

<T.Mesh position={[0, -30, 8]} name={"optics"} visible={true}>
  <T.SphereGeometry args={[2, 51, 51]} />
  <T.MeshStandardMaterial color="blue" />
</T.Mesh>

<!-- Lens 1 Geometry -->
<T.Mesh
  geometry={lens2}
  position={[0, 0, zPosition]}
  rotation={[90 * DEG2RAD, 0, 0]}
  name={"lens"}
  userData={lensProps}
>
  <T.MeshPhongMaterial
    color={"yellow"}
    shinness={100}
    opacity={0.8}
    transparent
    side={2}
  />
</T.Mesh>

<!-- Lens 2 Geometry -->
<T.Mesh
  geometry={lens2}
  position={[0, 0, zPosition * 2]}
  rotation={[90 * DEG2RAD, 0, 0]}
  name={"lens"}
  userData={lensProps}
>
  <T.MeshPhongMaterial
    color={"yellow"}
    shinness={100}
    opacity={0.8}
    transparent
    side={2}
  />
</T.Mesh>

<!-- Mirror 1 Geometry -->
<T.Mesh
  position={[1, 0, 50 + 1]}
  rotation={[-90 * DEG2RAD, 0, 45 * DEG2RAD]}
  name={"mirror"}
  userData={lensProps}
>
  <T.CylinderGeometry args={[10, 10, 2 * Math.SQRT2]} />
  <T.MeshPhongMaterial
    color={"lightblue"}
    shinness={100}
    opacity={1}
    reflectivity={1}
    side={2}
  />
</T.Mesh>

<T.Mesh position={[0, 0, -12]} on:click={sourceClick} name={"trace button"}>
  <T.BoxGeometry args={[2, 2, 2]} />
  <T.MeshStandardMaterial color="purple" />
</T.Mesh>

<!-- Center Line for System -->
<T.Mesh position={[0, 0, 0]} name={"line"}>
  <T
    is={Line2}
    geometry={new LineGeometry().setPositions(centerLine)}
    material={new LineMaterial({ color: "yellow", linewidth: 0.001 })}
  />
</T.Mesh>

{#if tracePoints.length > 0}
  <T.Mesh>
    <T
      is={Line2}
      geometry={genLineSegment(Vect3toFloat32(tracePoints))}
      material={new LineMaterial({ color: "red", linewidth: 0.003 })}
    />
  </T.Mesh>
{/if}
