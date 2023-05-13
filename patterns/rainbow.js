import { default as fs } from 'fs';
import { default as process } from 'process';
import { default as rgb } from 'hsv-rgb';

import { Model } from '../model.js';
import { dist, writeFrame } from '../utils.js';

async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

  const model = new Model;
  model.import(config.model);
  const pixelColors = [];

  console.error("Rainbow pattern!");

  const hz = .5;
  const rainbowWidth = 5; // meters
  const stride = .1;

  for (let frameIndex = 0; ; frameIndex ++) {
    const timeBias = (frameIndex / config.framesPerSecond) * hz;
    
    for (const pixel of model.pixels) {
      let color = rgb(((timeBias + pixel.x / rainbowWidth + pixel.y * stride) % 1) * 360,
        100 /* saturation */, 100 /* brightness */);

      for (let i = 0; i < 2; i ++)
        color[i] = Math.min(255, Math.max(0, color[i]));

      pixelColors[pixel.outputChannel()] = [...color, 255];
    };

    await writeFrame(frameIndex, pixelColors);
  }
}

await main();
