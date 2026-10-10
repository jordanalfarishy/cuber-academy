/* Shared facelet geometry and validation for a 3×3 cube. */
(function () {
  const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
  const faceClass = { U: 'top', R: 'right', F: 'front', D: 'bottom', L: 'left', B: 'back' };
  const names = { U: 'Atas', R: 'Kanan', F: 'Depan', D: 'Bawah', L: 'Kiri', B: 'Belakang' };
  const orientation = {
    U: 'Bagian bawah grid ini berbatasan dengan sisi depan (F).',
    R: 'Bagian kiri grid ini berbatasan dengan sisi depan (F).',
    F: 'Bagian atas grid ini berbatasan dengan sisi atas (U).',
    D: 'Bagian atas grid ini berbatasan dengan sisi depan (F).',
    L: 'Bagian kanan grid ini berbatasan dengan sisi depan (F).',
    B: 'Bagian atas grid ini berbatasan dengan sisi atas (U).'
  };
  const colors = {
    Y: { name: 'Kuning', hex: '#f2d653' },
    W: { name: 'Putih', hex: '#f5f6e8' },
    R: { name: 'Merah', hex: '#ec594f' },
    O: { name: 'Oranye', hex: '#f7a042' },
    B: { name: 'Biru', hex: '#4a88e9' },
    G: { name: 'Hijau', hex: '#60c284' }
  };
  const defaultCenters = { U: 'Y', R: 'B', F: 'R', D: 'W', L: 'G', B: 'O' };
  const faceMeta = { F: { axis: 2, layer: 1, dir: 1 }, B: { axis: 2, layer: -1, dir: -1 }, R: { axis: 0, layer: 1, dir: 1 }, L: { axis: 0, layer: -1, dir: -1 }, U: { axis: 1, layer: -1, dir: -1 }, D: { axis: 1, layer: 1, dir: 1 } };
  const normals = { U: [0, -1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, 1, 0], L: [-1, 0, 0], B: [0, 0, -1] };

  function position(face, index) {
    const row = Math.floor(index / 3) - 1;
    const col = index % 3 - 1;
    if (face === 'U') return [col, -1, row];
    if (face === 'R') return [1, row, -col];
    if (face === 'F') return [col, row, 1];
    if (face === 'D') return [col, 1, -row];
    if (face === 'L') return [-1, row, col];
    return [-col, row, -1];
  }

  function emptyState() {
    return Object.fromEntries(faces.map(face => [face, Array.from({ length: 9 }, (_, i) => i === 4 ? defaultCenters[face] : null)]));
  }

  function rotateGrid(values) {
    return [values[6], values[3], values[0], values[7], values[4], values[1], values[8], values[5], values[2]];
  }

  function rotateVector(vector, axis, dir) {
    const [x, y, z] = vector;
    if (axis === 0) return [x, -dir * z, dir * y];
    if (axis === 1) return [dir * z, y, -dir * x];
    return [-dir * y, dir * x, z];
  }

  function moveFacelets(facelets, move) {
    const face = move[0];
    const meta = faceMeta[face];
    if (!meta || facelets.length !== 54) throw new Error('Notasi atau jumlah kotak tidak valid.');
    const result = Array.from(facelets);
    const targetByFace = Object.fromEntries(faces.map(side => [side, new Map(Array.from({ length: 9 }, (_, i) => [position(side, i).join(','), i]))]));
    const turns = move.includes('2') ? 2 : 1;
    const dir = meta.dir * (move.includes("'") ? -1 : 1);
    for (let turn = 0; turn < turns; turn++) {
      const previous = result.slice();
      for (const side of faces) for (let index = 0; index < 9; index++) {
        const originalPosition = position(side, index);
        let nextPosition = originalPosition;
        let nextNormal = normals[side];
        if (originalPosition[meta.axis] === meta.layer) {
          nextPosition = rotateVector(originalPosition, meta.axis, dir);
          nextNormal = rotateVector(nextNormal, meta.axis, dir);
        }
        const nextSide = faces.find(candidate => normals[candidate].every((value, n) => value === nextNormal[n]));
        const nextIndex = targetByFace[nextSide].get(nextPosition.join(','));
        result[faces.indexOf(nextSide) * 9 + nextIndex] = previous[faces.indexOf(side) * 9 + index];
      }
    }
    return result.join('');
  }

  function isStateShape(state) {
    return !!state && faces.every(face => Array.isArray(state[face]) && state[face].length === 9 && state[face].every(code => code === null || Object.hasOwn(colors, code)));
  }

  function permutationParity(items) {
    let inversions = 0;
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (items[i] > items[j]) inversions++;
    return inversions % 2;
  }

  function isPermutation(items) {
    return items.every((value, index) => Number.isInteger(value) && value >= 0 && value < items.length) && new Set(items).size === items.length;
  }

  function validate(state, Cube) {
    if (!isStateShape(state)) return { ok: false, kind: 'shape', message: 'Data warna belum terbaca. Coba kosongkan dan isi ulang.' };
    const centers = faces.map(face => state[face][4]);
    if (centers.some(code => !code) || new Set(centers).size !== 6) return { ok: false, kind: 'centers', message: 'Enam pusat sisi harus memakai enam warna yang berbeda.' };
    const entries = faces.flatMap(face => state[face]);
    const missing = entries.filter(code => !code).length;
    if (missing) return { ok: false, kind: 'missing', message: `Masih ada ${missing} kotak yang belum diberi warna.` };
    for (const [code, details] of Object.entries(colors)) {
      const count = entries.filter(value => value === code).length;
      if (count !== 9) return { ok: false, kind: 'count', message: `Warna ${details.name.toLowerCase()} berjumlah ${count}. Setiap warna harus tepat 9 kotak.` };
    }
    const colorToFace = Object.fromEntries(faces.map(face => [state[face][4], face]));
    const facelets = entries.map(code => colorToFace[code]).join('');
    try {
      const cube = Cube.fromString(facelets);
      const { cp, co, ep, eo } = cube.toJSON();
      if (cube.asString() !== facelets || !isPermutation(cp) || !isPermutation(ep)) {
        return { ok: false, kind: 'pieces', message: 'Ada kombinasi stiker yang tidak cocok dengan potongan Rubik 3×3. Periksa arah sisi dan warna yang mungkin tertukar.' };
      }
      if (co.reduce((sum, value) => sum + value, 0) % 3 || eo.reduce((sum, value) => sum + value, 0) % 2 || permutationParity(cp) !== permutationParity(ep)) {
        return { ok: false, kind: 'parity', message: 'Susunan ini tidak bisa terjadi lewat putaran Rubik biasa. Periksa lagi kotak yang mungkin salah isi atau terbalik.' };
      }
      return { ok: true, facelets, cube };
    } catch {
      return { ok: false, kind: 'pieces', message: 'Susunan warna belum valid. Periksa kembali orientasi dan warna tiap sisi.' };
    }
  }

  function findValidOrientation(state, Cube) {
    const original = validate(state, Cube);
    if (original.ok) return { ok: true, state, turns: Object.fromEntries(faces.map(face => [face, 0])), validation: original };
    if (!['pieces', 'parity'].includes(original.kind)) return { ok: false, original };

    const variants = Object.fromEntries(faces.map(face => {
      const options = [];
      let grid = state[face];
      for (let turns = 0; turns < 4; turns++) {
        if (!options.some(option => option.grid.every((code, index) => code === grid[index]))) {
          options.push({ grid: [...grid], turns });
        }
        grid = rotateGrid(grid);
      }
      return [face, options];
    }));

    const candidate = {};
    const turns = {};
    let match = null;
    let ambiguous = false;

    function search(index) {
      if (ambiguous) return;
      if (index === faces.length) {
        const validation = validate(candidate, Cube);
        if (!validation.ok) return;
        if (match) { ambiguous = true; return; }
        match = {
          state: Object.fromEntries(faces.map(face => [face, [...candidate[face]]])),
          turns: { ...turns },
          validation
        };
        return;
      }
      const face = faces[index];
      for (const option of variants[face]) {
        candidate[face] = option.grid;
        turns[face] = option.turns;
        search(index + 1);
        if (ambiguous) return;
      }
    }

    search(0);
    if (ambiguous) return { ok: false, ambiguous: true, original };
    if (!match) return { ok: false, original };
    return { ok: true, ...match };
  }

  const api = { faces, faceClass, names, orientation, colors, defaultCenters, faceMeta, position, rotateVector, moveFacelets, rotateGrid, emptyState, isStateShape, validate, findValidOrientation };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.CubeState = api;
})();
