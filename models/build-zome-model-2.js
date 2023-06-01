import { Pixel, Node, Edge, Model } from '../model.js';
import { writeFile } from 'fs/promises';
import { dist, pathToRootOfTree } from '../utils.js';
import { readObjFile } from './read-obj-file.js';
import * as path from 'path';

  
async function main() {
  // Read in the mesh
  const verts = await readObjFile(path.join(pathToRootOfTree(), 'models', 'zome.obj'));

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

  // Find bottom vertices (based on which are within a centimeter of the ground). Sort them in a circle by increasing theta
  let baseVerts = [];
  for (let v of verts)
    if (v.point[2] <= .1)
      baseVerts.push(v);
  baseVerts.sort((v1, v2) => v1.cyl.theta - v2.cyl.theta);

  for (let v of baseVerts)
    console.log(v.cyl.theta);



  console.log(baseVerts);
  /*
  const filename = path.join(pathToRootOfTree(), 'models', 'zome.model');
  await writeFile(filename, JSON.stringify(model.export()));
  */
}

await main();