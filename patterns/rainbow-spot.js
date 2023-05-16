import { default as fs } from 'fs';
import { default as process } from 'process';
import { default as rgb } from 'hsv-rgb';

import { Model } from '../model.js';
import { dist, writeFrame } from '../utils.js';

async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

  const model = Model.import(config.model);
  const pixelColors = [];

  console.error("Rainbow spot pattern!");

  const rpm = 17;
  const center = model.center();

  for (let frameIndex = 0; ; frameIndex ++) {
    const displayTime = frameIndex / config.framesPerSecond;
    const radius = Math.sin(Math.PI * displayTime / 4) * 2;
    const timeAngle = 2.0 * Math.PI * displayTime / (60 / rpm);
    const cx = Math.cos(timeAngle) * radius + center[0];
    const cy = Math.sin(timeAngle) * radius + center[1];
    const timeBias = displayTime / 5;
    
    for (const pixel of model.pixels) {
      const d = dist([cx, cy, pixel.z], pixel.point);

      let color = rgb(((timeBias + d) % 1) * 360,
        100 /* saturation */, d < 1 ? 100 : 0 /* brightness */);

      for (let i = 0; i < 2; i ++)
        color[i] = Math.min(255, Math.max(0, color[i]));

      pixelColors[pixel.outputChannel()] = [...color, 255];
    };

    await writeFrame(frameIndex, pixelColors);
  }
}

await main();
