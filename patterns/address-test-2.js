import { default as fs } from 'fs';
import { default as process } from 'process';

import { Model } from '../model.js';
import { dist, writeFrame } from '../utils.js';

async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

  const model = Model.import(config.model);
  const pixelColors = [];

  console.error("Address test pattern (Mark 2)!");

  const framesPerStrand = 5;
  const pixelsPerStrand = [315, 315, 360, 360]; // repeats
  const numStrands = 40;
  let frameIndex = 0;

  while (true) {
    let startChannel = 0;

    for (let strand = 0; strand < numStrands; strand ++) {
      const pixelsInStrand = pixelsPerStrand[strand % pixelsPerStrand.length];
      const endChannel = startChannel + pixelsInStrand;
      console.error(`strand ${strand} - channels ${startChannel} to ${endChannel} (${pixelsInStrand})`);
 
      for (const pixel of model.pixels) {
        const ch = pixel.outputChannel();
        if (ch >= startChannel && ch < endChannel)
          pixelColors[ch] = [255, 255, 255, 255];
        else
          pixelColors[ch] = [0, 0, 0, 0];
      }

      for (let dwellFrame = 0; dwellFrame < framesPerStrand; dwellFrame ++) {
        await writeFrame(frameIndex, pixelColors);
      }

      startChannel += pixelsInStrand;
    }

    frameIndex ++;
  }
}

await main();
