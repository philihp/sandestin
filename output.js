function buildBuffer(layer, channelsPerPixel) {
  // Asssemble the frame data
  let pixels = layer.model.pixels;
  var buffer = Buffer.alloc(pixels.length * channelsPerPixel);
  for (let i = 0; i < pixels.length; i ++) {
    // XXX change the scale to [0,1]
    // XXX apply alpha?
    let offset = i * channelsPerPixel;
    buffer[offset ++] = Math.min(layer.colors[i * 4 + 1], 255); // green
    buffer[offset ++] = Math.min(layer.colors[i * 4 + 0], 255); // red
    buffer[offset ++] = Math.min(layer.colors[i * 4 + 2], 255); // blue
    if (channelsPerPixel === 4)
      buffer[offset] = 0; // placeholder for warm white
  }
  
  return buffer;
}

/*****************************************************************************/
/* WebSocket (for simulator)                                                 */
/*****************************************************************************/

import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: 3001 }); // XXX clean up

let wsConnections = new Set;

wss.on('connection', ws => {
  ws.on('message', data => {
    // Ignore incoming websocket messages for now
  });

  ws.on('close', (code, reason) => {
    console.log(`Connection closed: ${code} ${reason}`)
    wsConnections.delete(ws);
  });

  wsConnections.add(ws);
});

/*****************************************************************************/
/* E131 output (and main entry point)                                        */
/*****************************************************************************/

import { default as e131 } from 'e131';

// XXX move these to an appropriate place
// 10.2.0.8 is geoff-f48-2.int.monument.house
// We hardcode the IP because if we don't, a bug somewhere causes a DNS
// lookup for each and every e131 packet sent. This is a "good enough" fix
const e131Client = new e131.Client('10.2.0.8');  // or use a universe
const e131ChannelsPerPixel = 4; // XXX needs to be adjusted for zome vs rafters

export function sendFrame(layer) {
  return new Promise(resolve => {
    let buffer = buildBuffer(layer, 3);
    let e131Buffer = 
      (e131ChannelsPerPixel === 3 ? buffer : buildBuffer(layer, e131ChannelsPerPixel));

    // Enqueue for connected websockets
    wsConnections.forEach(ws => ws.send(buffer));

    // Now send to E131    
    var i = 0;
    var pos = 0;

    var startUniverse = 1;
    var thisUniverse = startUniverse;
    var channelsPerUniverse = 510;
    var packets = [];
    var totalChannels = e131Buffer.length;
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
        e131Buffer.copy(slotsData, 0, pos);
        pos += slotsData.length;
        e131Client.send(p, sendNextPacket);
      }
    } 

    sendNextPacket();
  });
}
