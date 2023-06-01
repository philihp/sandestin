import { Pixel, Node, Edge, Model } from '../model.js';
import { writeFile } from 'fs/promises';
import { pathToRootOfTree } from '../utils.js';
import * as path from 'path';

const inchesPerMeter = 39.3701;

async function buildRafterModel() {
    const model = new Model;

    // These are all in inches, but the actual coordinate system will be meters
    let rafterSpacing = [31.5, 32.5, 31.25, 32.2, 33, 30];
    let rafterLength = 3 * inchesPerMeter;
    let rafterHeight = 7;
    let pixelsPerRafter = 60 * 3; // 3 meters of 60 LED/meter pixel tape
  
    let cumulativeDistance = 0;
    let cumulativeOutputSlot = 0;
    for (let rafter = 0; rafter <= rafterSpacing.length; rafter ++) {
      for (let side = 0; side < 2; side ++) {
        let start = new Node(model, [0, cumulativeDistance / inchesPerMeter,
          side * rafterHeight / inchesPerMeter]);
        let end = new Node(model, [rafterLength / inchesPerMeter, cumulativeDistance / inchesPerMeter,
          side * rafterHeight / inchesPerMeter]);
        new Edge(model, start, end, pixelsPerRafter, cumulativeOutputSlot);
        cumulativeOutputSlot += pixelsPerRafter;
      }
  
      cumulativeDistance += rafterSpacing[rafter]; // will reference past end in final iteration
    }
  
    return model;
  }
  
async function main() {
  const model = await buildRafterModel();
  const filename = path.join(pathToRootOfTree(), 'models', 'rafters.model');

  await writeFile(filename, JSON.stringify(model.export()));
}

await main();