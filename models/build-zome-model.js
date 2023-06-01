import { Pixel, Node, Edge, Model } from '../model.js';
import { readFile, writeFile } from 'fs/promises';
import { dist, pathToRootOfTree } from '../utils.js';
import * as path from 'path';

async function buildModelFromObjFile(file) {
  let model = new Model;
  let verts = [null]; // Obj files are 1-based evidently
  let scaleFactor = 1/1000; // Our obj files are in millimeters - standardize on meters

  // XXX once we decide how to wire the physical structure, we will need to revise this function
  // to assign the correct output slots (to match the physical DMX addresses) - but for now, the
  // simulator is fine with any output slot to pixel mapping as long as it's consistent
  let nextOutputSlot = 0;
  let pixelsPerMeter = 60;

  let alreadyAddedEdge = {};
  function addFace(vertIndexes) {
    function addEdge(index1, index2) {
      let lower = Math.min(index1, index2);
      let higher = Math.max(index1, index2);
      let key = `${lower}~${higher}`;
      if (! (key in alreadyAddedEdge)) {
        let v1 = verts[lower];
        let v2 = verts[higher];
        // XXX need to revise to create both inner and outer pixels
        let pixelsOnEdge = Math.round(pixelsPerMeter * dist(v1.point, v2.point));
        new Edge(model, v1, v2, pixelsOnEdge, nextOutputSlot);
        nextOutputSlot += pixelsOnEdge;
        alreadyAddedEdge[key] = true;
        console.log(`added edge with ${pixelsOnEdge} pixels`);
      }
    }

    for (let i = 0; i < vertIndexes.length; i ++) {
      addEdge(vertIndexes[i], vertIndexes[(i + 1) % vertIndexes.length]);
    }
  }

  let lines = (await readFile(file, 'utf-8')).split(/\r?\n/);
  for (let line of lines) {
    let match;
    if (match = line.match(/^\s*$/))
      continue;
    if (match = line.match(/^\s*\#/))
      continue;
    if (match = line.match(/^\s*v\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*$/)) {
      let v = new Node(model, [parseFloat(match[1]) * scaleFactor,
        parseFloat(match[2]) * scaleFactor, parseFloat(match[3]) * scaleFactor]);
      verts.push(v);
      continue;
    }
    // Only supports quads and triangles for now
    if (match = line.match(/^\s*f\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*$/)) {
      addFace([parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4])]);
      continue;
    }
    if (match = line.match(/^\s*f\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*$/)) {
      addFace([parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]);
      continue;
    }
    throw new Error(`unhandled line in obj file: ${line}`);
  }

  return model;
}
  
async function main() {
  const model = await buildModelFromObjFile(path.join(pathToRootOfTree(), 'models', 'zome.obj'));
  const filename = path.join(pathToRootOfTree(), 'models', 'zome.model');
  await writeFile(filename, JSON.stringify(model.export()));
}

await main();