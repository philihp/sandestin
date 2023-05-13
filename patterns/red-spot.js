import { default as fs } from 'fs';
import { default as process } from 'process';

import { Model } from '../model.js';
import { dist, writeFrame } from '../utils.js';

async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

  const model = new Model;
  model.import(config.model);
  const pixelColors = [];

  console.error("Red spot pattern!");

  const radius = 2;
  const rpm = 20;
  const center = model.center();

  for (let frameIndex = 0; ; frameIndex ++) {
    let timeAngle = 2.0 * Math.PI * (frameIndex / config.framesPerSecond) / (60 / rpm);
    let cx = Math.cos(timeAngle) * radius + center[0];
    let cy = Math.sin(timeAngle) * radius + center[1];
    
    for (const pixel of model.pixels) {
      let d = dist([cx, cy, pixel.z], pixel.point);
      pixelColors[pixel.outputChannel()] = [Math.max(255 - d * 200, 0), 0, 0, 255];
    };

    await writeFrame(frameIndex, pixelColors);
  }
}

await main();
