import { default as fs } from 'fs';
import { default as process } from 'process';

import { Model } from '../model.js';
import { dist, writeFrame } from '../utils.js';

import { default as rgb } from 'hsv-rgb';


function computeStrands() {
  const pixelsPerStrand = [315, 315, 360, 360]; // repeats
  const numStrands = 40;
  const strands = [];
  let startChannel = 0;

  for (let strand = 0; strand < numStrands; strand ++) {
    const pixelsInStrand = pixelsPerStrand[strand % pixelsPerStrand.length];
    const endChannel = startChannel + pixelsInStrand;
    strands.push({
      startChannel: startChannel,
      pixelsInStrand: pixelsInStrand,
      endChannel: endChannel
    });

    startChannel += pixelsInStrand;
  }

  return strands;
}


async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

  const model = Model.import(config.model);
  const pixelColors = [];
  let strands = computeStrands();

  const decay = config.options.decay || .98;
  const saturationSpeed = config.options.saturationSpeed || 0.0;
  const whiteOnly = config.options.whiteOnly || false;  
  const colorSpeed = .1;

  console.error("Helix!");

  const sprites = [];
  const N = 10;

  if (config.options.mode === 0) {
    for (let i = 0; i < N; i ++) {
      sprites.push({
        strandNumber: 0 + i * 4,
        position: i / N,
        lastChannel: 0,
        stride: 0,
        speed: .01,
        color: i / N
      });

      sprites.push({
        strandNumber: 2 + i * 4,
        position: i / N,
        lastChannel: 0,
        stride: 0,
        speed: .01,
        color: i / N
      });

      let N2 = (N + N/2) % N;
      sprites.push({
        strandNumber: 1 + i * 4,
        position: i / N2,
        lastChannel: 0,
        stride: 0,
        speed: .01,
        color: i / N2
      });

      sprites.push({
        strandNumber: 2 + i * 4,
        position: i / N2,
        lastChannel: 3,
        stride: 0,
        speed: .01,
        color: i / N2
      });
    }
  }

  if (config.options.mode === 1) {
    for (let i = 0; i < N; i ++) {
      sprites.push({
        strandNumber: 0 + i * 4,
        position: 0,
        lastChannel: 0,
        stride: 0,
        speed: .01,
        color: i / N
      });

    sprites.push({
        strandNumber: 2 + i * 4,
        position: .5,
        lastChannel: 0,
        stride: 0,
        speed: .01,
        color: i / N
      });

      let N2 = (N + N/2) % N;
      sprites.push({
        strandNumber: 1 + i * 4,
        position: 0,
        lastChannel: 0,
        stride: 0,
        speed: .01,
        color: i / N
      });

      sprites.push({
        strandNumber: 2 + i * 4,
        position: .5,
        lastChannel: 3,
        stride: 0,
        speed: .01,
        color: i / N
      });
    }
  }


  // Fill buffer with black
  let maxChannel = 0;
  for (const pixel of model.pixels) {
    const ch = pixel.outputChannel();
    pixelColors[ch] = [0, 0, 0, 255];
    maxChannel = Math.max(maxChannel, ch);
  }

  for (let frameIndex = 0; ; frameIndex ++) {
    const displayTime = frameIndex / config.framesPerSecond;
    let saturation = (Math.sin(displayTime * saturationSpeed) + 1) / 2 * 100;
    if (whiteOnly)
      saturation = 0;

    for (const pixel of model.pixels) {
      const ch = pixel.outputChannel();
      pixelColors[ch][0] *= decay;
      pixelColors[ch][1] *= decay;
      pixelColors[ch][2] *= decay;
    };

    for (const sprite of sprites) {
      let color = rgb(((displayTime * colorSpeed + sprite.color) % 1) * 360,
        saturation, 100);

      for (let i = 0; i < 2; i ++)
        color[i] = Math.min(255, Math.max(0, color[i]));

      if (sprite.position >= 1.0) {
        sprite.position = 0;
        sprite.strandNumber = (sprite.strandNumber + sprite.stride + strands.length) % strands.length;
        sprite.lastChannel = strands[sprite.strandNumber].startChannel;
      }

      const strand = strands[sprite.strandNumber];
      const ch = Math.floor(strand.startChannel + (strand.pixelsInStrand) * sprite.position);

      for (let i = sprite.lastChannel + 1; i <= ch; i ++)
        pixelColors[i] = [...color, 255];
      sprite.lastChannel = ch;

      sprite.position += sprite.speed;
    }


    await writeFrame(frameIndex, pixelColors);
  }
}




await main();
