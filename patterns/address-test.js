import { default as fs } from 'fs';
import { default as process } from 'process';

import { Model } from '../model.js';
import { dist, writeFrame } from '../utils.js';

async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

  const model = Model.import(config.model);
  const pixelColors = [];

  console.error("Address test pattern!");

  const speed = 2.0;
  const length = 250;

  for (let frameIndex = 0; ; frameIndex ++) {
    const startChannel = Math.floor((frameIndex * speed) % model.pixels.length);
    const endChannel = startChannel + length;
    
    for (const pixel of model.pixels) {
      const ch = pixel.outputChannel();
      if (ch >= startChannel && ch < endChannel)
        pixelColors[ch] = [255, 255, 255, 255];
      else
        pixelColors[ch] = [0, 0, 0, 0];
    }

    await writeFrame(frameIndex, pixelColors);
  }
}

await main();
