import { Buffer } from 'buffer';
import { default as fs } from 'fs';

async function main() {
  let pixelCount = 7120; // XXX read from file passed on command line
  const buf = Buffer.alloc(4 + pixelCount * 4);

  let r = 0, b = 0, g = 0;

  for (let frameIndex = 0; ; frameIndex++) {
    buf.writeInt32LE(frameIndex, 0);
    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
      buf.writeUint8(r, pixelIndex * 4 + 0); // R
      buf.writeUint8(b, pixelIndex * 4 + 1); // G
      buf.writeUint8(g, pixelIndex * 4 + 2); // B
      buf.writeUint8(255, pixelIndex * 4 + 3); // A
    }
    fs.writeSync(1 /* stdout */, buf);

    r = (r + 1) % 256;
    b = (b + 2) % 256;
    g = (g + 3) % 256;
  }
}

await main();
