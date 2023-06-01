import { Pixel, Node, Edge, Model } from '../model.js';
import { writeFile } from 'fs/promises';
import { dist, pathToRootOfTree } from '../utils.js';
import { readObjFile } from './read-obj-file.js';
import * as path from 'path';

const EPSILON = .1; // 1 centimeter
const PI = Math.PI;
const METERS_PER_INCH = .0254;

const pixelsPerMeter = 60;
const strutWidth = 1.5 * METERS_PER_INCH;

function isClockwise(from, to) {
  function normalizeRadians(theta) {
    // Normalize angle to [0, 2*PI)
    return ((theta % (2 * PI)) + 2 * PI) % (2 * PI);
  }
   
  return normalizeRadians(from.cyl.theta - to.cyl.theta) <
    normalizeRadians(to.cyl.theta - from.cyl.theta);
}

function findNextVert(vert, accept) {
  for (let v of vert.edgesTo) {
    if (v.cyl.z - vert.cyl.z < EPSILON)
      continue; // consider upward movements only

      if (v.cyl.r <= EPSILON) {
      // This edge leads to the center
      if (accept.center)
        return v;
      continue;
    }

    if (isClockwise(vert, v)) {
      if (accept.clockwise)
        return v;
      continue;
    } else {
      if (accept.counterclockwise)
        return v;
      continue;
    }
  }

  return null;
}
  
async function buildZomeFromObjFile(pathToObjFile) {
  let model = new Model;
  let nextOutputSlot = 0;

  // Read in the mesh
  const verts = await readObjFile(pathToObjFile);

  // Compute extents and centroid
  let min = [...verts[0].point];
  let max = [...verts[0].point];
  let centroid = [0, 0, 0];
  for (let v of verts) {
    for (let i = 0; i < 3; i ++) {
      min[i] = Math.min(min[i], v.point[i]);
      max[i] = Math.max(max[i], v.point[i]);
      centroid[i] += v.point[i] / verts.length;
    }
  }

  // Compute cylindrical coordinates (with z axis through centroid as axis of cylinder, and z=0 as bottom of model)
  for (let v of verts) {
    const translated = [ v.point[0] - centroid[0], v.point[1] - centroid[1], v.point[2] - min[2] ];
    v.cyl = {
      r: Math.sqrt(translated[0] * translated[0] + translated[1] * translated[1]),
      theta: Math.atan2(translated[1], translated[0]),
      z: translated[2]
    };
    v.t = translated;
  }

  // Find bottom vertices (based on which are within EPSILON of the ground). Sort them in a circle, clockwise
  let baseVerts = [];
  for (let v of verts)
    if (v.point[2] <= EPSILON)
      baseVerts.push(v);
  baseVerts.sort((v1, v2) => v2.cyl.theta - v1.cyl.theta);

  // Now trace the LED strands up from each bottom vertex in both clockwise and counterclockwise directions.
  // Do clockwise first and let the clockwise strand be the one traced all the way up to the top.
  function traceStrand(start, accept, side) {
    let startOutputSlot = nextOutputSlot;

    let from = start;
    while (from) {
      let to = findNextVert(from, accept);
      if (! to)
        break;
      console.log(`segment from ${JSON.stringify(from.cyl)} to ${JSON.stringify(to.cyl)}`);

      function displace(point) {
        // Move half a strut width toward (side == 0) or away (side == 1) the center line
        const toCenterLine = [point[0] - centroid[0], point[1] - centroid[1]];
        const mag = Math.sqrt(toCenterLine[0] * toCenterLine[0] + toCenterLine[1] * toCenterLine[1]);
        const scale = (strutWidth / 2) / mag * (side === 0 ? -1 : 1);
        return [point[0] + toCenterLine[0] * scale, point[1] + toCenterLine[1] * scale, point[2]];
      }

      const nodeKey = `side${side}Node`;
      if (! from[nodeKey])
        from[nodeKey] = new Node(model, displace(from.point)); 
      if (! to[nodeKey])
        to[nodeKey] = new Node(model, displace(to.point));

      const pixelsOnEdge = Math.round(pixelsPerMeter * dist(from.point, to.point));
      new Edge(model, from[nodeKey], to[nodeKey], pixelsOnEdge, nextOutputSlot);
      nextOutputSlot += pixelsOnEdge;

      // XXX front and back
      from = to;
    }

    console.log(`total ${nextOutputSlot - startOutputSlot} pixels in strand`);
  }

  let receiver = 0;
  for (let base of baseVerts) {
    console.log(`** Receiver ${receiver}, clockwise:`);
    traceStrand(base, { clockwise: true, center: true }, 0); // outer
    traceStrand(base, { clockwise: true, center: true }, 1); // inner
    console.log(`** Receiver ${receiver}, counterclockwise:`);
    traceStrand(base, { counterclockwise: true }, 0); // outer
    traceStrand(base, { counterclockwise: true }, 1); // inner
    receiver ++;
  }

  return model;
}

async function main() {
  const model = await buildZomeFromObjFile(path.join(pathToRootOfTree(), 'models', 'zome.obj'));
  const filename = path.join(pathToRootOfTree(), 'models', 'full-zome.model');
  await writeFile(filename, JSON.stringify(model.export()));
}


await main();