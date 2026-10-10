const test = require('node:test');
const assert = require('node:assert/strict');
const State = require('../dist/cube-state.js');
const Cube = require('../dist/vendor/cube.js');
require('../dist/vendor/solve.js');

const solved = new Cube().asString();
function toColorState(facelets) {
  return Object.fromEntries(State.faces.map((face, faceIndex) => [face,
    [...facelets.slice(faceIndex * 9, faceIndex * 9 + 9)].map(letter => State.defaultCenters[letter])
  ]));
}

test('every quarter, inverse, and double turn matches the solver model', () => {
  for (const face of State.faces) for (const suffix of ['', "'", '2']) {
    const move = face + suffix;
    const cube = new Cube();
    cube.move(move);
    assert.equal(State.moveFacelets(solved, move), cube.asString(), move);
  }
});

test('entered colors reject incomplete and physically impossible states', () => {
  const incomplete = State.emptyState();
  assert.equal(State.validate(incomplete, Cube).ok, false);
  const flippedEdge = toColorState(solved);
  [flippedEdge.U[7], flippedEdge.F[1]] = [flippedEdge.F[1], flippedEdge.U[7]];
  assert.equal(State.validate(flippedEdge, Cube).ok, false);
  assert.equal(State.findValidOrientation(flippedEdge, Cube).ok, false);
});

test('correct stickers entered with rotated face grids are recovered', () => {
  const cube = new Cube();
  cube.move("R U F2 L' D B U2 R'");
  const original = toColorState(cube.asString());
  const entered = Object.fromEntries(State.faces.map(face => [face, [...original[face]]]));
  entered.U = State.rotateGrid(entered.U);
  entered.R = State.rotateGrid(State.rotateGrid(entered.R));
  entered.B = State.rotateGrid(State.rotateGrid(State.rotateGrid(entered.B)));
  assert.equal(State.validate(entered, Cube).ok, false);
  const recovered = State.findValidOrientation(entered, Cube);
  assert.equal(recovered.ok, true);
  assert.deepEqual(recovered.state, original);
  assert.equal(recovered.validation.facelets, cube.asString());
});

test('a valid entered scramble solves to six single-color faces', () => {
  const cube = new Cube();
  cube.move("R U F2 L' D B U2 R'");
  const input = State.validate(toColorState(cube.asString()), Cube);
  assert.equal(input.ok, true);
  Cube.initSolver();
  let facelets = input.facelets;
  for (const move of input.cube.solve().trim().split(/\s+/)) facelets = State.moveFacelets(facelets, move);
  assert.equal(facelets, solved);
});
