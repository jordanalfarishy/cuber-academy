importScripts('./vendor/cube.js', './vendor/solve.js');

let initialized = false;
self.onmessage = event => {
  const { facelets, requestId } = event.data;
  try {
    if (!initialized) {
      Cube.initSolver();
      initialized = true;
    }
    const cube = Cube.fromString(facelets);
    const solution = cube.isSolved() ? '' : cube.solve(25);
    if (solution && !cube.clone().move(solution).isSolved()) throw new Error('Solusi yang dihasilkan tidak sesuai.');
    self.postMessage({ requestId, solution });
  } catch (error) {
    self.postMessage({ requestId, error: error instanceof Error ? error.message : String(error) });
  }
};
