import { sleep, dist } from './utils.js';
import { sendFrame } from './output.js';
import { Pixel, Node, Edge, Model } from './model.js';
import { default as fs } from 'fs';
import { default as tmp } from 'tmp';
tmp.setGracefulCleanup();
import { default as path } from 'path';
import { default as child_process } from 'child_process';

function buildRafterModel() {
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

function buildModelFromObjFile(file) {
  let model = new Model;
  let verts = [null]; // Obj files are 1-based evidently
  let scaleFactor = 1/1000; // Our obj files are in millimeters - standardize on meters

  // XXX once we decide how to wire the physical structure, we will need to revise this function
  // to assign the correct output slots (to match the physical DMX addresses) - but for now, the
  // simulator is fine with any output slot to pixel mapping as long as it's consistent
  let nextOutputSlot = 0;
  let pixelsPerMeter = 60;

  let alreadyAddedEdge = {};
  function addFace(vertIndexes) {
    function addEdge(index1, index2) {
      let lower = Math.min(index1, index2);
      let higher = Math.max(index1, index2);
      let key = `${lower}~${higher}`;
      if (! (key in alreadyAddedEdge)) {
        let v1 = verts[lower];
        let v2 = verts[higher];
        // XXX need to revise to create both inner and outer pixels
        let pixelsOnEdge = Math.round(pixelsPerMeter * dist(v1.point, v2.point));
        new Edge(model, v1, v2, pixelsOnEdge, nextOutputSlot);
        nextOutputSlot += pixelsOnEdge;
        alreadyAddedEdge[key] = true;
        console.log(`added edge with ${pixelsOnEdge} pixels`);
      }
    }

    for (let i = 0; i < vertIndexes.length; i ++) {
      addEdge(vertIndexes[i], vertIndexes[(i + 1) % vertIndexes.length]);
    }
  }

  let lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
  for (let line of lines) {
    let match;
    if (match = line.match(/^\s*$/))
      continue;
    if (match = line.match(/^\s*\#/))
      continue;
    if (match = line.match(/^\s*v\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*$/)) {
      let v = new Node(model, [parseFloat(match[1]) * scaleFactor,
        parseFloat(match[2]) * scaleFactor, parseFloat(match[3]) * scaleFactor]);
      verts.push(v);
      continue;
    }
    // Only supports quads and triangles for now
    if (match = line.match(/^\s*f\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*$/)) {
      addFace([parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4])]);
      continue;
    }
    if (match = line.match(/^\s*f\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*$/)) {
      addFace([parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]);
      continue;
    }
    throw new Error(`unhandled line in obj file: ${line}`);
  }

  return model;
}

/*****************************************************************************/
/* Frame rendering                                                           */
/*****************************************************************************/

import { default as rgb } from 'hsv-rgb';

class RainbowPattern {
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

class RedSpotPattern {
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

class RainbowSpotPattern {
  get(frame) {
    let layer = new Layer(frame.model);
    let radius = Math.sin(Math.PI * frame.displayTime / 4) * 2;
    let rpm = 17;
    let timeAngle = 2.0 * Math.PI * frame.displayTime / (60 / rpm);
    let center = frame.model.center();
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

class BlankPattern {
  get(frame) {
    return new Layer(frame.model);
  }
}

class LinearTopToBottomPattern {
  get(frame) {
    let layer = new Layer(frame.model);
    let threshold = 1 - frame.displayTime/5 % 1; 
    let topZ = frame.model.center()[2] * 2;
    let lightEndZ = threshold * topZ;
    frame.model.edges.forEach(edge => {
      let colorTemplate = [255,255,255]; // TODO: add colors 
      edge.pixels.forEach(pixel => {
        if (pixel.z > lightEndZ) {
          let brightness = 1 - (pixel.z - lightEndZ) / ( topZ/3 );
          if (brightness > 0) {
            let color = colorTemplate.map(x => x * brightness);
            layer.setRGB(pixel, color);
          }
        }
      })
    })
    return layer;
  }
}


class LinearRandomWalkPattern{
  // TODO: ideally the tail of each light can be seen on previous edge (real fading effect) 

  constructor(number){
    this.number = number; // number of light particles flowing around
    this.edgeIndices =  Array.from({length: this.number}, () => Math.floor(Math.random() * this.number)); //random starting edges
    this.directions = Array(this.number).fill("down"); 
  }
  get(frame) {
    let layer = new Layer(frame.model);
    for (let p = 0; p < this.number; p++){
      let currEdge = frame.model.edges[this.edgeIndices[p]];
      let threshold = (frame.displayTime  ) % 1; // precentage of the edge that will have color
      let brightestPixelIndex = Math.ceil(threshold * currEdge.pixels.length);
      let colorTemplate = [255,255,255]; //TODO: add colors
      for (let i = 0; i < brightestPixelIndex; i++) {
        let brightness = i / brightestPixelIndex; // 0 to 1 for fading effect 
        let color = colorTemplate.map(x => x * brightness);
        if (this.directions[p] == "down") {
          layer.setRGB(currEdge.pixels[i], color);
        }
        else{
          layer.setRGB(currEdge.pixels[currEdge.pixels.length-1-i], color);
        }
      }

      if (brightestPixelIndex == currEdge.pixels.length){ //find a neighbor edge to be the next edge
        let currentPoint = this.directions[p] == "down" ? currEdge.endNode.point : currEdge.startNode.point;
        let nextEdgesDown = frame.model.edges.filter(edge => edge.startNode.point === currentPoint && edge.id != currEdge.id);
        let nextEdgesUp = frame.model.edges.filter(edge => edge.endNode.point === currentPoint && edge.id != currEdge.id);
        if (nextEdgesDown.length == 0 && nextEdgesUp.length == 0) { // reset to 0
          this.edgeIndices[p] = 0;
        }
        else{ // choose a random neighbor
          const random = Math.floor(Math.random() * (nextEdgesDown.length + nextEdgesUp.length));
          if (random >= nextEdgesDown.length) {
            this.edgeIndices[p] = nextEdgesUp[random - nextEdgesDown.length].id; 
            this.directions[p] = "up"
          }
          else{
            this.edgeIndices[p] = nextEdgesDown[random].id; 
            this.directions[p] = "down"
          }
          // console.log("curr edge id:", currEdge.id , "next edge id: ", this.edgeIndex, "direction: ", this.direction)
        }
      }


    }
    
    return layer;
  }
}

/*****************************************************************************/
/* Instruments (external pattern generator programs)                         */
/*****************************************************************************/

class Instrument {
  // model: a Model to pass to the instrument
  // framesPerSecond: the fps to tell the instrument to render at
  // program: eg 'node', 'python'.. should be in $PATH
  // args: string array of arguments
  constructor(model, framesPerSecond, program, args) {
    const totalPixels = model.pixelCount();
    const frameSize = 4 + 4 * totalPixels;

    const toolConfiguration = {
      framesPerSecond: framesPerSecond,
      model: model.export(),
    };
  
    const tmpobj = tmp.fileSync();
    fs.writeSync(tmpobj.fd, JSON.stringify(toolConfiguration));

    this.child = child_process.spawn(program, [...args, tmpobj.name]);
    this.child.on('close', (code) => {
      // XXX handle this?
      console.log(`child process exited with code ${code}`);
    });
    this.child.on('error', (err) => {
      // XXX handle this
      console.log('Failed to start subprocess.');
    });

    this.child.stderr.pipe(process.stderr); // XXX revisit later? at least break it into lines and prefix it?
  
    // if needed for performance, could rewrite this to reduce the number of copies
    // (keep the incoming buffers in an array, and copy out to a buffer, sans frame number, in getFrame())
    async function* packetize(stream) {
      let childBuf = Buffer.alloc(0);
  
      for await (const buf of stream) {
        childBuf = Buffer.concat([childBuf, buf]);
        while (childBuf.length >= frameSize) {
          let frameData = childBuf.subarray(0, frameSize);
          childBuf = childBuf.subarray(frameSize);
          yield frameData;
        }
      }
    }
  
    this.childPacketIterator = packetize(this.child.stdout)[Symbol.asyncIterator]();
  }

  // XXX make it take the wanted frame nummber?
  async getFrame() {
    let item = await this.childPacketIterator.next();
    if (item.done)
      return null; // and perhaps make clean/error exit status available on anotehr method?
    else
      return item.value;
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
import { fileURLToPath } from 'url';
const port = 3000;
function startServer(model) {
  let app = express();

  // Serve static assets
  let pathToRootOfTree = path.dirname(fileURLToPath(import.meta.url))
  app.use(express.static(path.join(pathToRootOfTree, 'web')));

  // API
  app.get('/api/model', (req, res) => {
    return res.send(JSON.stringify(model.export()));
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Web interface on http://localhost:${port}`)
  })
}

async function main() {
  let pathToRootOfTree = path.dirname(fileURLToPath(import.meta.url))
  let model = buildModelFromObjFile(path.join(pathToRootOfTree, 'zome_3D.obj'));
  console.log(`Model has ${model.nodes.length} nodes, ${model.edges.length} edges, and ${model.pixels.length} pixels`);

  let framesPerSecond = 40;
  let msPerFrame = 1000.0 / framesPerSecond;
  let totalPixels = model.pixelCount();

  startServer(model);

  let mainObject = new LinearTopToBottomPattern;
  let instrument = new Instrument(model, framesPerSecond, 'node', [path.join(pathToRootOfTree, 'patterns', 'tool-test.js')]);

  // let mainObject = new RainbowSpotPattern;
  // let mainObject = new LinearRandomWalkPattern(15);

  let lastFrameIndex = null;
  let startTime = Date.now();

  while (true) {
    // We should redo this at some point so that displayTime is actually the time the frame's
    // going to be displayed (for music sync purposes). Currently it's actually the time the
    // frame is rendered.
    // XXX disregard above and rewrite this for new tool model
    let msSinceStart = (Date.now() - startTime);
    let frameIndex = Math.floor(msSinceStart / msPerFrame) + 1;
    let displayTimeMs = startTime + frameIndex * msPerFrame;
    let frame = new Frame(model, frameIndex, displayTimeMs / 1000);
    await sleep(displayTimeMs - Date.now());

    let frameData = await instrument.getFrame();
    if (! frameData) {
      console.log(`pattern exited`);
      break;
    }
//    console.log(frameData);

    // XXX check frame number, loop until we catch up, bail out if we fall too far behind
    let layer = new Layer(frame.model);
    for (let i = 0; i < frame.model.pixels.length; i ++) {
      let r = frameData.readUint8(4 + i * 4 + 0);
      let g = frameData.readUint8(4 + i * 4 + 1);
      let b = frameData.readUint8(4 + i * 4 + 2);
      let a = frameData.readUint8(4 + i * 4 + 3);
      layer.setRGB(frame.model.pixels[i], [r, g, b]);
    }

    await sendFrame(layer);

    if (lastFrameIndex !== null && lastFrameIndex !== frameIndex - 1) {
      console.log(`warning: skipped frames from ${lastFrameIndex} to ${frameIndex}`);
    }
    lastFrameIndex = frameIndex;
  }
}

await main();

// XXX mixer notes:
// new_value = pixel * alpha + old_value * (1 - alpha)
//
// effective_alpha = pixel_alpha * layer_alpha
// new_value = pixel * effective_alpha + old_value * (1 - effective_alpha)
//
// From backmost layer to frontmost layer
// You can avoid divisions by doing one rescale per layer (which can be a multiplication)
// At the end you get a double per LED channel which you could gamma correct if desired