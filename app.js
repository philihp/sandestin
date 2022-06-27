var channelsPerPixel = 4;

// "await sleep(1000)"
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dist(point1, point2) {
  let dx = point1[0] - point2[0];
  let dy = point1[1] - point2[1];
  let dz = point1[2] - point2[2];
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

/*****************************************************************************/
/* Model geometry                                                            */
/*****************************************************************************/

let nodes = [];
let edges = [];
let pixels = [];
let outputSlotToPixel = [];

class Pixel {
  constructor(point, outputSlot) {
    this.id = pixels.length;
    pixels[this.id] = this;

    this.point = point;
    this.x = this.point[0];
    this.y = this.point[1];
    this.z = this.point[2];

    this.outputSlot = outputSlot;
    if (outputSlotToPixel[outputSlot] !== undefined)
      throw new Error(`channel collision at channel ${firstChannel}`)
    outputSlotToPixel[outputSlot] = this;
  }
}

class Node {
  constructor(point) {
    this.id = nodes.length;
    nodes[this.id] = this;

    this.point = point;
    this.edges = [];
  }
}

class Edge {
  constructor(startNode, endNode, numPixels, firstOutputSlot) {
    this.id = edges.length;
    edges[this.id] = this;

    this.startNode = startNode;
    startNode.edges.push(this);
    this.endNode = endNode;
    endNode.edges.push(this);

    this.pixels = [];
    for(let i = 0; i < numPixels; i ++) {
      // Evenly space the pixels along the edge, with the same space between startNode
      // and the first pixel, and endNode and the last pixel, as between adjacent pixels
      let frac = (i + 1) / (numPixels + 1);
      let pixel = new Pixel(
        [0, 1, 2].map(j =>
          startNode.point[j] + (endNode.point[j] - startNode.point[j]) * frac),
        firstOutputSlot + i
      );
      this.pixels.push(pixel);
    }
  }
}

class Model {
  _initialize() {
    // Compute the (axis-aligned) bounding box of the model
    this.min = [...pixels[0].point];
    this.max = [...pixels[0].point];

    pixels.forEach(pixel => {
      for (let i = 0; i < 3; i ++) {
        this.min[i] = Math.min(this.min[i], pixel.point[i]);
        this.max[i] = Math.max(this.max[i], pixel.point[i]);
      }
    });
  }

  // Return the center of the (axis-aligned) bounding box
  center() {
    return [0, 1, 2].map(i => (this.max[i] + this.min[i]) / 2);
  }
}

let model = new Model;

function buildModel() {
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
      let start = new Node([0, cumulativeDistance / inchesPerMeter,
        side * rafterHeight / inchesPerMeter]);
      let end = new Node([rafterLength / inchesPerMeter, cumulativeDistance / inchesPerMeter,
        side * rafterHeight / inchesPerMeter]);
      new Edge(start, end, pixelsPerRafter, cumulativeOutputSlot);
      cumulativeOutputSlot += pixelsPerRafter;
    }

    cumulativeDistance += rafterSpacing[rafter]; // will reference past end in final iteration
  }
}
   
/*****************************************************************************/
/* E131 output                                                               */
/*****************************************************************************/

import { default as e131 } from 'e131';

// 10.2.0.8 is geoff-f48-2.int.monument.house
// We hardcode the IP because if we don't, a bug somewhere causes a DNS
// lookup for each and every e131 packet sent. This is a "good enough" fix
var e131Client = new e131.Client('10.2.0.8');  // or use a universe

function sendFrame(layer) {
  return new Promise(resolve => {
    var buffer = Buffer.alloc(pixels.length * channelsPerPixel);
    for (let i = 0; i < pixels.length; i ++) {
      // XXX change the scale to [0,1]
      // XXX apply alpha?
      let offset = pixels[i].outputSlot * channelsPerPixel;
      buffer[offset ++] = Math.min(layer.colors[i * 4 + 1], 255); // green
      buffer[offset ++] = Math.min(layer.colors[i * 4 + 0], 255); // red
      buffer[offset ++] = Math.min(layer.colors[i * 4 + 2], 255); // blue
      if (channelsPerPixel === 4)
        buffer[offset] = 0; // warm white
    }
    
    var i = 0;
    var pos = 0;

    var startUniverse = 1;
    var thisUniverse = startUniverse;
    var channelsPerUniverse = 510;
    var packets = [];
    var totalChannels = buffer.length;
    for (let idx = 0; idx < totalChannels; ) {
      var theseChannels = Math.min(totalChannels - idx, channelsPerUniverse);
      var p = e131Client.createPacket(theseChannels);
      p.setSourceName('sandestin');
      p.setUniverse(thisUniverse);
      p.setPriority(p.DEFAULT_PRIORITY);  // not strictly needed, done automatically
      packets.push(p);
      idx += theseChannels;
      thisUniverse ++;
    }
    
    function sendNextPacket() {
      if (i === packets.length) {
        resolve();
      } else {
        var p = packets[i];
        i += 1;
        var slotsData = p.getSlotsData();
        buffer.copy(slotsData, 0, pos);
        pos += slotsData.length;
        e131Client.send(p, sendNextPacket);
      }
    } 

    sendNextPacket();
  });
}

/*****************************************************************************/
/* Frame rendering                                                           */
/*****************************************************************************/

import { default as rgb } from 'hsv-rgb';

class RainbowLayer {
  get(frame) {
    let layer = new Layer;
    let hz = .5;
    let timeBias = frame.displayTime * hz;
    let rainbowWidth = 5; // meters
    let stride = .1;
  
    pixels.forEach(pixel => {
      let color = rgb(((timeBias + pixel.x / rainbowWidth + pixel.y * stride) % 1) * 360,
        100 /* saturation */, 100 /* brightness */);
      layer.setRGB(pixel, color);
    });

    return layer;
  }
}

class RedSpotLayer {
  get(frame) {
    let layer = new Layer;
    let radius = 2;
    let rpm = 20;
    let timeAngle = 2.0 * Math.PI * frame.displayTime / (60 / rpm);
    let center = model.center();
    let cx = Math.cos(timeAngle) * radius + center[0];
    let cy = Math.sin(timeAngle) * radius + center[1];

    pixels.forEach(pixel => {
      let d = dist([cx, cy, pixel.z], pixel.point);
      layer.setRGB(pixel, [Math.max(255 - d*200,0), 0, 0]);
    });

    return layer;
  }
}

class RainbowSpotLayer {
  get(frame) {
    let layer = new Layer;
    let radius = Math.sin(Math.PI * frame.displayTime / 4) * 2;
    let rpm = 17;
    let timeAngle = 2.0 * Math.PI * frame.displayTime / (60 / rpm);
    let center = model.center();
    let cx = Math.cos(timeAngle) * radius + center[0];
    let cy = Math.sin(timeAngle) * radius + center[1];
    let timeBias = frame.displayTime / 5;

    pixels.forEach(pixel => {
      let d = dist([cx, cy, pixel.z], pixel.point);

      let color = rgb(((timeBias + d) % 1) * 360,
        100 /* saturation */, d < 1 ? 100 : 0/* brightness */);
      layer.setRGB(pixel, color);
    });

    return layer;
  }
}

/*****************************************************************************/
/* Main loop                                                                 */
/*****************************************************************************/

class Frame {
  constructor(index, displayTime) {
    this.index = index;
    this.displayTime = displayTime;
  }
}

class Layer {
  constructor() {
    this.colors = new Array(pixels.length * 4).fill(0);
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

async function main() {
  buildModel();
  model._initialize();
  console.log(`Model has ${nodes.length} nodes, ${edges.length} edges, and ${pixels.length} pixels`);

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
    let frame = new Frame(frameIndex, displayTimeMs / 1000);
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
