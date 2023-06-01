import { readFile } from 'fs/promises';

export async function readObjFile(file, scaleFactor) {
  let verts = [];
  scaleFactor = scaleFactor || 1/1000; // Default to assuming that the obj file coordinates are in millimeters

  function addFace(vertIndexes) {
    for (let i = 0; i < vertIndexes.length; i ++) {
      const v1 = verts[vertIndexes[i]];
      const v2 = verts[vertIndexes[(i + 1) % vertIndexes.length]];
      v1.edgesTo.add(v2);
      v2.edgesTo.add(v1);
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
      verts.push({
        index: verts.length,
        point: [parseFloat(match[1]) * scaleFactor, parseFloat(match[2]) * scaleFactor, parseFloat(match[3]) * scaleFactor],
        edgesTo: new Set
      });
      continue;
    }
    // Only supports quads and triangles for now
    // Subtract one because obj files are apparently 1-based
    if (match = line.match(/^\s*f\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*$/)) {
      addFace([parseInt(match[1]) - 1, parseInt(match[2]) - 1, parseInt(match[3]) - 1, parseInt(match[4]) - 1]);
      continue;
    }
    if (match = line.match(/^\s*f\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*$/)) {
      addFace([parseInt(match[1]) - 1, parseInt(match[2]) - 1, parseInt(match[3]) - 1]);
      continue;
    }
    throw new Error(`unhandled line in obj file: ${line}`);
  }

  return verts;
}
