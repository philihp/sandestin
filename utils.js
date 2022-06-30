// "await sleep(1000)"
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function dist(point1, point2) {
  let dx = point1[0] - point2[0];
  let dy = point1[1] - point2[1];
  let dz = point1[2] - point2[2];
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}
