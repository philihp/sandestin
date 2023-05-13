/*****************************************************************************/
/* Model geometry                                                            */
/*****************************************************************************/

export class Pixel {
  constructor(model, point, outputSlot) {
    this.model = model;

    this.id = outputSlot;
    if (model.pixels[this.id] !== undefined)
      throw new Error(`channel collision at channel ${this.id}`)
    model.pixels[this.id] = this;

    this.point = point;
    this.x = this.point[0];
    this.y = this.point[1];
    this.z = this.point[2];

    model.modified = true;
  }

  export() {
    return this.point;
  }
}

export class Node {
  constructor(model, point) {
    this.model = model;
    this.id = model.nodes.length;
    model.nodes[this.id] = this;

    this.point = point;
    this.edges = [];
    model.modified = true;
  }

  export() {
    return {
      point: this.point,
      edges: this.edges.map(edge => edge.id)
    }
  }
}

export class Edge {
  constructor(model, startNode, endNode, numPixels, firstOutputSlot) {
    this.model = model;
    if (startNode.model !== model || endNode.model !== model)
      throw new Error("mixing geometry from different models");

    this.id = model.edges.length;
    model.edges[this.id] = this;

    this.startNode = startNode;
    startNode.edges.push(this);
    this.endNode = endNode;
    endNode.edges.push(this);

    this.pixels = [];
    for(let i = 0; i < numPixels; i ++) {
      // Evenly space the pixels along the edge, with the same space between startNode
      // and the first pixel, and endNode and the last pixel, as between adjacent pixels
      let frac = (i + 1) / (numPixels + 1);
      let pixel = new Pixel(model,
        [0, 1, 2].map(j =>
          startNode.point[j] + (endNode.point[j] - startNode.point[j]) * frac),
        firstOutputSlot + i
      );
      this.pixels.push(pixel);
    }

    model.modified = true;
  }

  export() {
    return {
      startNode: this.startNode.id,
      endNode: this.endNode.id,
      pixels: this.pixels.map(pixel => pixel.id)
    }
  }
}

export class Model {
  constructor() {
    this._reset();
  }

  _reset() {
    this.nodes = [];
    this.edges = [];
    this.pixels = [];

    this.modified = true;
    this.min = null;
    this.max = null;
  }

  _ensureUpToDate() {
    if (! this.modified)
      return;

    // Compute the (axis-aligned) bounding box of the model
    this.min = [...this.pixels[0].point];
    this.max = [...this.pixels[0].point];

    this.pixels.forEach(pixel => {
      for (let i = 0; i < 3; i ++) {
        this.min[i] = Math.min(this.min[i], pixel.point[i]);
        this.max[i] = Math.max(this.max[i], pixel.point[i]);
      }
    });

    this.modified = false;
  }

  // Return the center of the (axis-aligned) bounding box
  center() {
    this._ensureUpToDate();
    return [0, 1, 2].map(i => (this.max[i] + this.min[i]) / 2);
  }

  pixelCount() {
    return this.pixels.length;
  }

  export() {
    return {
      pixels: this.pixels.map(pixel => pixel ? pixel.export() : null),
      nodes: this.nodes.map(node => node.export()),
      edges: this.edges.map(edge => edge.export())
    };
  }

}
   
