import { sleep, dist } from './utils.js';
import { sendFrame } from './output.js';
import { Pixel, Node, Edge, Model } from './model.js';

function buildModel() {
  let model = new Model;
  let inchesPerMeter = 39.3701;

  // These are all in inches, but the actual coordinate system will be meters
  let rafterSpacing = [31.5, 32.5, 31.25, 32.2, 33, 30];
  let rafterLength = 3 * inchesPerMeter;
  let rafterHeight = 7;
  let pixelsPerRafter = 60 * 3; // 3 meters of 60 LED/meter pixel tape

  let cumulativeDistance = 0;
  let cumulativeOutputSlot = 0;
  for (let rafter = 0; rafter <= rafterSpacing.length; rafter ++) {
    for (let side = 0; side < 2; side ++) {
      let start = new Node(model, [0, cumulativeDistance / inchesPerMeter,
        side * rafterHeight / inchesPerMeter]);
      let end = new Node(model, [rafterLength / inchesPerMeter, cumulativeDistance / inchesPerMeter,
        side * rafterHeight / inchesPerMeter]);
      new Edge(model, start, end, pixelsPerRafter, cumulativeOutputSlot);
      cumulativeOutputSlot += pixelsPerRafter;
    }

    cumulativeDistance += rafterSpacing[rafter]; // will reference past end in final iteration
  }

  return model;
}


/*****************************************************************************/
/* Frame rendering                                                           */
/*****************************************************************************/

import { default as rgb } from 'hsv-rgb';

class RainbowLayer {
  get(frame) {
    let layer = new Layer(frame.model);
    let hz = .5;
    let timeBias = frame.displayTime * hz;
    let rainbowWidth = 5; // meters
    let stride = .1;
  
    frame.model.pixels.forEach(pixel => {
      let color = rgb(((timeBias + pixel.x / rainbowWidth + pixel.y * stride) % 1) * 360,
        100 /* saturation */, 100 /* brightness */);
      layer.setRGB(pixel, color);
    });

    return layer;
  }
}

class RedSpotLayer {
  get(frame) {
    let layer = new Layer(frame.model);
    let radius = 2;
    let rpm = 20;
    let timeAngle = 2.0 * Math.PI * frame.displayTime / (60 / rpm);
    let center = frame.model.center();
    let cx = Math.cos(timeAngle) * radius + center[0];
    let cy = Math.sin(timeAngle) * radius + center[1];

    frame.model.pixels.forEach(pixel => {
      let d = dist([cx, cy, pixel.z], pixel.point);
      layer.setRGB(pixel, [Math.max(255 - d*200,0), 0, 0]);
    });

    return layer;
  }
}

class RainbowSpotLayer {
  get(frame) {
    let layer = new Layer(frame.model);
    let radius = Math.sin(Math.PI * frame.displayTime / 4) * 2;
    let rpm = 17;
    let timeAngle = 2.0 * Math.PI * frame.displayTime / (60 / rpm);
    let center = model.center();
    let cx = Math.cos(timeAngle) * radius + center[0];
    let cy = Math.sin(timeAngle) * radius + center[1];
    let timeBias = frame.displayTime / 5;

    frame.model.pixels.forEach(pixel => {
      let d = dist([cx, cy, pixel.z], pixel.point);

      let color = rgb(((timeBias + d) % 1) * 360,
        100 /* saturation */, d < 1 ? 100 : 0/* brightness */);
      layer.setRGB(pixel, color);
    });

    return layer;
  }
}

class BlankLayer {
  get(frame) {
    return new Layer(frame.model);
  }
}

/*****************************************************************************/
/* Main loop                                                                 */
/*****************************************************************************/

class Frame {
  constructor(model, index, displayTime) {
    this.model = model;
    this.index = index;
    this.displayTime = displayTime;
  }
}

class Layer {
  constructor(model) {
    this.model = model;
    this.colors = new Array(model.pixels.length * 4).fill(0);
  }
  setRGB(pixel, color) {
    let offset = pixel.id * 4;
    this.colors[offset ++] = color[0];
    this.colors[offset ++] = color[1];
    this.colors[offset ++] = color[2];
    this.colors[offset] = 1; /* alpha */
  }
  setRGBA(pixel, color, alpha) {
    let offset = pixel.id * 4;
    this.colors[offset ++] = color[0];
    this.colors[offset ++] = color[1];
    this.colors[offset ++] = color[2];
    this.colors[offset] = alpha;
  }
}

import { application, default as express } from 'express';
import { default as path } from 'path';
import { fileURLToPath } from 'url';
const port = 3000;
function startServer(model) {
  let app = express();

  // Serve static assets
  let pathToRootOfTree = path.dirname(fileURLToPath(import.meta.url))
  app.use(express.static(path.join(pathToRootOfTree, 'web')));

  // API
  app.get('/api/model', (req, res) => {
    return res.send(JSON.stringify(model.toJSON()));
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Web interface on http://localhost:${port}`)
  })
}

async function main() {
  let model = buildModel();
  console.log(`Model has ${model.nodes.length} nodes, ${model.edges.length} edges, and ${model.pixels.length} pixels`);

  startServer(model);

  let mainObject = new RedSpotLayer;

  let framesPerSecond = 40;
  let msPerFrame = 1000.0 / framesPerSecond;
  let lastFrameIndex = null;
  let startTime = Date.now();
  while (true) {
    // We should redo this at some point so that displayTime is actually the time the frame's
    // going to be displayed (for music sync purposes). Currently it's actually the time the
    // frame is rendered.
    let msSinceStart = (Date.now() - startTime);
    let frameIndex = Math.floor(msSinceStart / msPerFrame) + 1;
    let displayTimeMs = startTime + frameIndex * msPerFrame;
    let frame = new Frame(model, frameIndex, displayTimeMs / 1000);
    await sleep(displayTimeMs - Date.now());

    let layer = mainObject.get(frame);
    await sendFrame(layer);

    if (lastFrameIndex !== null && lastFrameIndex !== frameIndex - 1) {
      console.log(`warning: skipped frames from ${lastFrameIndex} to ${frameIndex}`);
    }
    lastFrameIndex = frameIndex;
  }
}

await main();
