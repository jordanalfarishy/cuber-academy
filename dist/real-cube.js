(function () {
  const S = window.CubeState;
  const $ = id => document.getElementById(id);
  const ui = Object.fromEntries([
    'face-tabs', 'face-label', 'face-name', 'face-count', 'face-orientation', 'sticker-grid',
    'color-palette', 'prev-face', 'next-face', 'real-cube', 'real-cube-wrap',
    'filled-count', 'filled-percent', 'real-progress-fill', 'color-counts', 'real-message',
    'solve-real', 'demo-real', 'clear-real', 'solution-result', 'solution-summary',
    'solution-progress', 'solution-moves', 'solution-dock', 'dock-move',
    'dock-description', 'dock-fill', 'dock-count', 'dock-prev', 'dock-next'
  ].map(id => [id, $(id)]));
  const storageKey = 'cuber-real-colors-v1';
  const mainCubies = [...document.querySelectorAll('#cube .cubie')];
  const previewCubies = new Map();
  let state = readSavedState();
  let activeFace = 'U';
  let selectedColor = state.U[4];
  let solution = null;
  let solutionIndex = 0;
  let solving = false;
  let worker = null;
  let pendingReject = null;
  let requestId = 0;
  let status = null;
  let previewX = -25;
  let previewY = -35;
  let drag = null;
  let suppressPreviewClick = false;

  function readSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (S.isStateShape(saved)) return saved;
    } catch {}
    return S.emptyState();
  }

  function saveState() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }

  function buildPreviewCube() {
    let index = 0;
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (!x && !y && !z) continue;
      const clone = mainCubies[index++].cloneNode(true);
      ui['real-cube'].append(clone);
      previewCubies.set([x, y, z].join(','), clone);
    }
    for (const face of S.faces) for (let index = 0; index < 9; index++) {
      const cubie = previewCubies.get(S.position(face, index).join(','));
      const sticker = cubie.querySelector(`.${S.faceClass[face]}`);
      sticker.classList.add('paintable');
      sticker.dataset.face = face;
      sticker.dataset.index = String(index);
    }
  }

  function paintSticker(face, index) {
    if (index === 4 && !selectedColor) {
      setStatus('Pusat sisi harus memiliki warna. Pilih salah satu warna dahulu.', 'error');
      return;
    }
    state[face][index] = selectedColor;
    activeFace = face;
    saveState();
    invalidateSolution();
    render();
  }

  function renderPreview() {
    for (const face of S.faces) for (let index = 0; index < 9; index++) {
      const cubie = previewCubies.get(S.position(face, index).join(','));
      const sticker = cubie.querySelector(`.${S.faceClass[face]}`);
      const code = state[face][index];
      sticker.style.setProperty('--sticker', code ? S.colors[code].hex : '#2d4056');
    }
  }

  function renderTabs() {
    ui['face-tabs'].replaceChildren();
    S.faces.forEach(face => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `face-tab${face === activeFace ? ' active' : ''}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', face === activeFace ? 'true' : 'false');
      button.setAttribute('aria-label', `Sisi ${S.names[face]}`);
      button.style.setProperty('--face-color', S.colors[state[face][4]]?.hex || '#71859a');
      button.textContent = face;
      button.addEventListener('click', () => selectFace(face));
      ui['face-tabs'].append(button);
    });
  }

  function renderGrid() {
    const face = activeFace;
    const entries = state[face];
    ui['face-label'].textContent = `SISI ${S.names[face].toUpperCase()}`;
    ui['face-name'].textContent = `${S.names[face]} / ${face}`;
    ui['face-count'].textContent = `${entries.filter(Boolean).length} / 9`;
    ui['face-orientation'].textContent = S.orientation[face];
    ui['sticker-grid'].replaceChildren();
    entries.forEach((code, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sticker-cell${index === 4 ? ' center' : ''}${code ? '' : ' unset'}`;
      button.style.setProperty('--tile', code ? S.colors[code].hex : '#33445a');
      button.setAttribute('aria-label', `${index === 4 ? 'Pusat, ' : ''}baris ${Math.floor(index / 3) + 1} kolom ${index % 3 + 1}, ${code ? S.colors[code].name : 'belum diisi'}`);
      button.title = code ? S.colors[code].name : 'Belum diisi';
      button.addEventListener('click', () => paintSticker(face, index));
      ui['sticker-grid'].append(button);
    });
    const faceIndex = S.faces.indexOf(face);
    ui['prev-face'].disabled = faceIndex === 0;
    ui['next-face'].disabled = faceIndex === S.faces.length - 1;
  }

  function renderPalette() {
    ui['color-palette'].replaceChildren();
    for (const [code, color] of [...Object.entries(S.colors), [null, { name: 'Hapus', hex: '#2a3a4f' }]]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `palette-button${selectedColor === code ? ' active' : ''}${code ? '' : ' erase'}`;
      button.setAttribute('aria-label', code ? `Pilih warna ${color.name}` : 'Pilih penghapus warna');
      button.setAttribute('aria-pressed', selectedColor === code ? 'true' : 'false');
      button.style.setProperty('--tile', color.hex);
      button.innerHTML = `<i aria-hidden="true"></i><span>${color.name}</span>`;
      button.addEventListener('click', () => { selectedColor = code; renderPalette(); });
      ui['color-palette'].append(button);
    }
  }

  function renderCounts() {
    const all = S.faces.flatMap(face => state[face]);
    const filled = all.filter(Boolean).length;
    ui['filled-count'].textContent = `${filled} dari 54 kotak`;
    ui['filled-percent'].textContent = `${Math.round(filled / 54 * 100)}%`;
    ui['real-progress-fill'].style.width = `${filled / 54 * 100}%`;
    ui['color-counts'].replaceChildren();
    for (const [code, color] of Object.entries(S.colors)) {
      const count = all.filter(entry => entry === code).length;
      const item = document.createElement('div');
      item.className = `color-count${count > 9 ? ' over' : ''}`;
      item.style.setProperty('--tile', color.hex);
      item.innerHTML = `<i aria-hidden="true"></i><span>${color.name}</span><strong>${count}/9</strong>`;
      ui['color-counts'].append(item);
    }
  }

  function setStatus(message, type = '') {
    status = { message, type };
    renderStatus();
  }

  function renderStatus() {
    const missing = S.faces.flatMap(face => state[face]).filter(value => !value).length;
    ui['real-message'].className = `real-message${status?.type ? ` ${status.type}` : ''}`;
    ui['real-message'].textContent = status?.message || (missing ? `${missing} kotak lagi perlu diisi sebelum solusi bisa dibuat.` : 'Semua kotak terisi. Periksa susunanmu, lalu cari solusi.');
  }

  function render() {
    renderTabs();
    renderGrid();
    renderPalette();
    renderCounts();
    renderPreview();
    renderStatus();
  }

  function selectFace(face) {
    activeFace = face;
    selectedColor = state[face][4];
    render();
  }

  function stopWorker() {
    if (worker) worker.terminate();
    worker = null;
    if (pendingReject) {
      const reject = pendingReject;
      pendingReject = null;
      reject(new Error('cancelled'));
    }
    solving = false;
    ui['solve-real'].disabled = false;
    ui['solve-real'].querySelector('span:nth-child(2)').textContent = 'Cari solusi Rubik saya';
  }

  function invalidateSolution() {
    if (solving) stopWorker();
    requestId++;
    solution = null;
    solutionIndex = 0;
    ui['solution-result'].hidden = true;
    ui['solution-dock'].hidden = true;
    window.CuberApp.restoreInput = null;
    status = null;
  }

  function moveDetail(move) {
    const face = move[0];
    const color = S.colors[state[face][4]].name.toLowerCase();
    const turn = move.includes('2') ? 'putar 180°' : move.includes("'") ? 'putar 90° berlawanan jarum jam' : 'putar 90° searah jarum jam';
    return `Sisi ${S.names[face].toLowerCase()} (${color}) · ${turn}.`;
  }

  function updateSolution() {
    if (!solution) return;
    const done = solutionIndex >= solution.length;
    ui['solution-result'].hidden = false;
    ui['solution-dock'].hidden = false;
    ui['solution-summary'].textContent = solution.length ? `${solution.length} putaran menuju selesai` : 'Kubusmu sudah selesai!';
    ui['solution-progress'].textContent = `${solutionIndex} / ${solution.length}`;
    ui['dock-count'].textContent = `${solutionIndex} dari ${solution.length} putaran selesai`;
    ui['dock-fill'].style.width = solution.length ? `${solutionIndex / solution.length * 100}%` : '100%';
    ui['dock-move'].textContent = done ? 'Kubus selesai! ✦' : `Putaran ${solutionIndex + 1}: ${solution[solutionIndex].replace("'", '’')}`;
    ui['dock-description'].textContent = done ? 'Semua warna kembali ke sisinya. Cocokkan dengan Rubik aslimu.' : moveDetail(solution[solutionIndex]);
    ui['dock-prev'].disabled = solutionIndex === 0 || solving;
    ui['dock-next'].disabled = done || solving;
    ui['solution-moves'].replaceChildren();
    solution.forEach((move, index) => {
      const token = document.createElement('span');
      token.className = `solution-token${index < solutionIndex ? ' done' : ''}${index === solutionIndex ? ' active' : ''}`;
      token.textContent = move.replace("'", '’');
      token.title = moveDetail(move);
      ui['solution-moves'].append(token);
    });
  }

  function solveInWorker(facelets) {
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      if (!worker) worker = new Worker('./solve-worker.js');
      worker.onmessage = event => {
        if (event.data.requestId !== id) return;
        pendingReject = null;
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.solution);
      };
      worker.onerror = event => {
        pendingReject = null;
        reject(new Error(event.message || 'Worker solver gagal dimuat.'));
      };
      pendingReject = reject;
      worker.postMessage({ facelets, requestId: id });
    });
  }

  async function solveRealCube() {
    if (solving) return;
    const checked = S.validate(state, Cube);
    if (!checked.ok) { setStatus(checked.message, 'error'); return; }
    invalidateSolution();
    window.CuberApp.loadFacelets(state);
    solving = true;
    ui['solve-real'].disabled = true;
    ui['solve-real'].querySelector('span:nth-child(2)').textContent = 'Menyiapkan solver…';
    setStatus('Susunan valid. Mesin solusi sedang menyiapkan langkah; ini bisa memakan beberapa detik.', 'success');
    try {
      const algorithm = await solveInWorker(checked.facelets);
      solution = algorithm.trim() ? algorithm.trim().split(/\s+/) : [];
      solutionIndex = 0;
      window.CuberApp.restoreInput = () => {
        window.CuberApp.loadFacelets(state);
        solutionIndex = 0;
        updateSolution();
        setStatus('Kubus 3D kembali ke kondisi yang kamu masukkan.', 'success');
      };
      updateSolution();
      setStatus(solution.length ? `Solusi siap: ${solution.length} putaran. Ikuti satu per satu pada kubus 3D.` : 'Kubus yang kamu masukkan sudah selesai.', 'success');
      document.getElementById('simulator').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      if (error.message !== 'cancelled') {
        stopWorker();
        setStatus('Mesin solusi belum berhasil memproses kubus ini. Periksa kembali warnanya lalu coba lagi.', 'error');
      }
    } finally {
      solving = false;
      ui['solve-real'].disabled = false;
      ui['solve-real'].querySelector('span:nth-child(2)').textContent = 'Cari solusi Rubik saya';
      updateSolution();
    }
  }

  async function advanceSolution(direction) {
    if (!solution || window.CuberApp.isBusy()) return;
    if (direction === 1 && solutionIndex >= solution.length) return;
    if (direction === -1 && solutionIndex <= 0) return;
    const move = direction === 1 ? solution[solutionIndex] : solution[solutionIndex - 1];
    const inverse = move.endsWith('2') ? move : move.endsWith("'") ? move[0] : `${move[0]}'`;
    ui['dock-prev'].disabled = true;
    ui['dock-next'].disabled = true;
    await window.CuberApp.playMove(direction === 1 ? move : inverse);
    solutionIndex += direction;
    updateSolution();
  }

  function updatePreviewView() {
    ui['real-cube'].style.transform = `rotateX(${previewX}deg) rotateY(${previewY}deg) scale(var(--cube-scale))`;
  }

  ui['real-cube-wrap'].addEventListener('pointerdown', event => {
    drag = { x: event.clientX, y: event.clientY, viewX: previewX, viewY: previewY, moved: false };
  });
  ui['real-cube-wrap'].addEventListener('pointermove', event => {
    if (!drag) return;
    if (!drag.moved && Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) > 5) {
      drag.moved = true;
      ui['real-cube-wrap'].setPointerCapture(event.pointerId);
    }
    previewY = drag.viewY + (event.clientX - drag.x) * .5;
    previewX = Math.max(-85, Math.min(85, drag.viewX - (event.clientY - drag.y) * .5));
    updatePreviewView();
  });
  ui['real-cube-wrap'].addEventListener('pointerup', () => {
    suppressPreviewClick = !!drag?.moved;
    drag = null;
    setTimeout(() => suppressPreviewClick = false, 0);
  });
  ui['real-cube-wrap'].addEventListener('pointercancel', () => drag = null);
  ui['real-cube-wrap'].addEventListener('click', event => {
    if (suppressPreviewClick) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const sticker = hit?.closest('.cubie-face.paintable');
    if (sticker && ui['real-cube'].contains(sticker)) paintSticker(sticker.dataset.face, Number(sticker.dataset.index));
  });
  ui['prev-face'].addEventListener('click', () => selectFace(S.faces[S.faces.indexOf(activeFace) - 1]));
  ui['next-face'].addEventListener('click', () => selectFace(S.faces[S.faces.indexOf(activeFace) + 1]));
  ui['solve-real'].addEventListener('click', solveRealCube);
  ui['dock-next'].addEventListener('click', () => advanceSolution(1));
  ui['dock-prev'].addEventListener('click', () => advanceSolution(-1));
  ui['clear-real'].addEventListener('click', () => { state = S.emptyState(); saveState(); invalidateSolution(); selectFace('U'); setStatus('Kotak dikosongkan. Warna pusat kembali ke contoh awal.', 'success'); });
  ui['demo-real'].addEventListener('click', () => {
    const facelets = Cube.random().asString();
    state = Object.fromEntries(S.faces.map((face, faceIndex) => [face, [...facelets.slice(faceIndex * 9, faceIndex * 9 + 9)].map(letter => S.defaultCenters[letter])]));
    saveState(); invalidateSolution(); selectFace('U'); setStatus('Contoh Rubik acak sudah terisi. Klik “Cari solusi” untuk mencobanya.', 'success');
  });
  window.addEventListener('cuber:manual-change', () => {
    if (solution) {
      invalidateSolution();
      setStatus('Kubus 3D diputar manual. Cari solusi lagi untuk memulai ulang dari warna yang kamu masukkan.', 'error');
    }
  });

  buildPreviewCube();
  render();
})();
