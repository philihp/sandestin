import { default as fs } from 'fs';
import { default as process } from 'process';
import { default as rgb } from 'hsv-rgb';

import { Model } from '../model.js';
import { dist, writeFrame } from '../utils.js';

async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

  const model = Model.import(config.model);
  const pixelColors = [];

  console.error("GPT3's pattern!");

  const color = [];

  for (let frameIndex = 0; ; frameIndex ++) {
    const displayTime = frameIndex / (config.framesPerSecond) * 10;

    for (const pixel of model.pixels) {
      color[0] = Math.sin((pixel.x * 10 + displayTime) * 0.1) * 127 + 128;
      color[1] = Math.cos((pixel.y * 10 + displayTime) * 0.2) * 127 + 128;
      color[2] = Math.sin((pixel.z * 10 + displayTime) * 0.3) * 127 + 128;

      for (let i = 0; i < 2; i ++)
        color[i] = Math.min(255, Math.max(0, color[i]));

      pixelColors[pixel.outputChannel()] = [...color, 255];
    }
 
    await writeFrame(frameIndex, pixelColors);
  }
}

await main();