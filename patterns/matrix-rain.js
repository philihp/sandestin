import { default as fs } from 'fs';
import { default as process } from 'process';
import { default as rgb } from 'hsv-rgb';

import { Model } from '../model.js';
import { dist, writeFrame } from '../utils.js';

async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

  const model = Model.import(config.model);
  const pixelColors = [];

  console.error("Matrix rain!");

  const hz = .5;
  const stride = -.01;

  for (let frameIndex = 0; ; frameIndex ++) {
    const timeBias = 10000 - (frameIndex / config.framesPerSecond) * hz;

    for (const pixel of model.pixels) {
      let color = rgb(
        0.3 * 360, /* green */
        100, /* saturation */
        ((timeBias + pixel.id * stride) % 1) * 100
        /* brightness */);

      for (let i = 0; i < 2; i ++)
        color[i] = Math.min(255, Math.max(0, color[i]));

      pixelColors[pixel.outputChannel()] = [...color, 255];
    };

    await writeFrame(frameIndex, pixelColors);
  }
}

await main();
