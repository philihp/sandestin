import { Buffer } from 'buffer';
import { default as fs } from 'fs';
import { default as process } from 'process';

import { sleep, dist } from '../utils.js';

function writeAsyncToStream(stream, data) {
  return new Promise((resolve, reject) => {
    const canWrite = stream.write(data);

    if (canWrite) {
      resolve();
    } else {
      stream.once('drain', resolve);
    }

    // XXX not sure what to do here - it seems like we should catch errors but this is a memory leak
    // stream.on('error', reject);
  });
}

function centerPoint(model) {
  let min = [...model.pixels[0]];
  let max = [...model.pixels[0]];

  model.pixels.forEach(pixel => {
    for (let i = 0; i < 3; i ++) {
      min[i] = Math.min(min[i], pixel[i]);
      max[i] = Math.max(max[i], pixel[i]);
    }
  });

  return [0, 1, 2].map(i => (max[i] + min[i]) / 2);
}

async function main() {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const pixelCount = config.model.pixels.length;

  const buf = Buffer.alloc(4 + pixelCount * 4);

  console.error("hi from tool");

  let radius = 2;
  let rpm = 20;
  let center = centerPoint(config.model);
  const pixelColors = [];

  for (let frameIndex = 0; ; frameIndex++) {
    let timeAngle = 2.0 * Math.PI * (frameIndex / config.framesPerSecond) / (60 / rpm);
    let cx = Math.cos(timeAngle) * radius + center[0];
    let cy = Math.sin(timeAngle) * radius + center[1];
    
    for (let i = 0; i < config.model.pixels.length; i ++) {
      let pixel = config.model.pixels[i];
      let d = dist([cx, cy, pixel[2]], pixel);
      pixelColors[i] = [Math.max(255 - d*200,0), 0, 0];
    };

    buf.writeInt32LE(frameIndex, 0);
    
    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
      buf.writeUint8(pixelColors[pixelIndex][0], 4 + pixelIndex * 4 + 0); // R
      buf.writeUint8(pixelColors[pixelIndex][1], 4 + pixelIndex * 4 + 1); // G
      buf.writeUint8(pixelColors[pixelIndex][2], 4 + pixelIndex * 4 + 2); // B
      buf.writeUint8(255, 4 + pixelIndex * 4 + 3); // A
    }
    
  await writeAsyncToStream(process.stdout, buf);
  }
}

await main();
