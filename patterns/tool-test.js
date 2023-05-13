import { default as fs } from 'fs';
import { default as process } from 'process';

import { Model } from '../model.js';
import { dist, writeFrame } from '../utils.js';

async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

  const model = new Model;
  model.import(config.model);

  console.error("hi from tool");

  let radius = 2;
  let rpm = 20;
  const pixelColors = [];

  for (let frameIndex = 0; ; frameIndex++) {
    let timeAngle = 2.0 * Math.PI * (frameIndex / config.framesPerSecond) / (60 / rpm);
    let center = model.center();
    let cx = Math.cos(timeAngle) * radius + center[0];
    let cy = Math.sin(timeAngle) * radius + center[1];
    
    for (let i = 0; i < config.model.pixels.length; i ++) {
      let pixel = config.model.pixels[i];
      let d = dist([cx, cy, pixel[2]], pixel);
      pixelColors[i] = [Math.max(255 - d*200,0), 0, 0, 255];
    };

    await writeFrame(frameIndex, pixelColors);
  }
}

await main();
