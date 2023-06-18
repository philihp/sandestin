import { default as fs } from 'fs';
import { default as process } from 'process';
import { default as rgb } from 'hsv-rgb';

import { Model } from '../model.js';
import { dist, writeFrame } from '../utils.js';

async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

  const model = Model.import(config.model);
  const pixelColors = [];

  console.error("Tunnel pattern!");

  const cps = 1/5;
  const hueScale = .5;

  for (let frameIndex = 0; ; frameIndex ++) {
    const displayTime = frameIndex / (config.framesPerSecond);
    const timeBias = displayTime * cps;
    
    for (const pixel of model.pixels) {

      let color = rgb(((timeBias + pixel.z * hueScale) % 1) * 360,
        100 /* saturation */, (Math.sin(displayTime + pixel.z)+1)/2*100 /* brightness */);

      for (let i = 0; i < 2; i ++)
        color[i] = Math.min(255, Math.max(0, color[i]));

      pixelColors[pixel.outputChannel()] = [...color, 255];
    };

    await writeFrame(frameIndex, pixelColors);
  }
}

await main();
