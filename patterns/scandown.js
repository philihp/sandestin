import { default as fs } from 'fs';
import { default as process } from 'process';
import { default as rgb } from 'hsv-rgb';

import { Model } from '../model.js';
import { dist, writeFrame } from '../utils.js';

async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

  const model = Model.import(config.model);
  const pixelColors = [];
  for (const pixel of model.pixels)
    pixelColors[pixel.outputChannel()] = [0, 0, 0, 255];

  console.error("Scandown pattern!");

  const scanDimension = 2;

  model._ensureUpToDate(); // XXX hack
  const top = model.max[scanDimension];
  const bottom = model.min[scanDimension];
  const secondsPerCycle = config.options.secondsPerCycle || 2.0;
  const bandWidth = config.options.bandWidth || .1;

  for (let frameIndex = 0; ; frameIndex ++) {
    const displayTime = frameIndex / config.framesPerSecond;

    const zCenter = bottom + (top - bottom) * (displayTime % secondsPerCycle) / secondsPerCycle;
    console.error(`${zCenter}`);

    for (const pixel of model.pixels) {
      const isInBand = Math.abs(pixel.point[scanDimension] - zCenter) < bandWidth / 2;

      if (isInBand)
        pixelColors[pixel.outputChannel()] = [255, 255, 255, 255];
      else
        pixelColors[pixel.outputChannel()] = [0, 0, 0, 0];
    };

    await writeFrame(frameIndex, pixelColors);
  }
}

await main();
