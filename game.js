// game.js — modular game bootstrap continued
// Added helpers to integrate existing inline SVG (#board) and to disable keyboard controls

window.GAME = window.GAME || {};

(function(global){
  const STORAGE_KEY = 'lastsector:settings:v1';

  const defaults = {
    gridWidth: 11,
    gridHeight: 9,
    fontSize: 14,
    animations: true,
    sessionMinutes: 5,
    fuelPrice: 1000,
    balance: 0
  };

  function loadSettings(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return Object.assign({}, defaults);
      const parsed = JSON.parse(raw);
      return Object.assign({}, defaults, parsed);
    }catch(e){
      console.warn('Ошибка загрузки настроек, используем defaults', e);
      return Object.assign({}, defaults);
    }
  }

  function saveSettings(s){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  const state = {
    settings: loadSettings(),
    svgBoard: null,
    tiles: [],
    keyboardDisabled: false,
    keyboardBlocker: null
  };

  // UI helpers
  function createControls(){
    const container = document.querySelector('#remoteContainer') || document.body;
    if(document.getElementById('ls-controls')) return;

    const controls = document.createElement('div');
    controls.id = 'ls-controls';
    controls.style.cssText = 'position:fixed;left:12px;top:12px;z-index:1200;display:flex;gap:8px;';

    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = 'Настройки';
    settingsBtn.className = 'ghost';
    settingsBtn.onclick = openSettings;

    const endTurnBtn = document.createElement('button');
    endTurnBtn.textContent = 'Конец хода';
    endTurnBtn.className = 'ghost';
    endTurnBtn.onclick = ()=>{
      const ev = new CustomEvent('endTurn', { detail: { ts: Date.now() } });
      window.dispatchEvent(ev);
      console.info('Сгенерировано событие endTurn');
    };

    const buyFuelBtn = document.createElement('button');
    buyFuelBtn.id = 'ls-buyFuel';
    buyFuelBtn.textContent = 'Купить топливо (' + state.settings.fuelPrice + ')';
    buyFuelBtn.className = 'ghost';
    buyFuelBtn.onclick = ()=>{
      const ok = buyFuel();
      if(ok) alert('Топливо куплено');
      else alert('Недостаточно средств');
    };

    const integrateBtn = document.createElement('button');
    integrateBtn.textContent = 'Интегрировать Board';
    integrateBtn.className = 'ghost';
    integrateBtn.onclick = ()=>{ integrateExistingBoard(); };

    const disableKbBtn = document.createElement('button');
    disableKbBtn.textContent = 'Откл. клавиатуру';
    disableKbBtn.className = 'ghost';
    disableKbBtn.onclick = ()=>{ toggleKeyboardBlocking(); };

    controls.appendChild(settingsBtn);
    controls.appendChild(endTurnBtn);
    controls.appendChild(buyFuelBtn);
    controls.appendChild(integrateBtn);
    controls.appendChild(disableKbBtn);
    document.body.appendChild(controls);
  }

  // settings modal
  function openSettings(){
    if(document.getElementById('ls-settings')) return;
    const modal = document.createElement('div');
    modal.id = 'ls-settings';
    modal.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1300;padding:14px;background:rgba(8,12,20,.98);border:1px solid rgba(100,140,200,.12);box-shadow:0 8px 30px rgba(0,0,0,.6);min-width:320px;color:#e8ecf5;font-family:Rajdhani, sans-serif;';

    modal.innerHTML = `
      <h3 style="margin:0 0 8px 0;font-family:Orbitron, sans-serif;">Настройки</h3>
      <label>Ширина поля: <input id="ls-gridWidth" type="number" min="7" max="40"></label><br>
      <label>Высота поля: <input id="ls-gridHeight" type="number" min="5" max="30"></label><br>
      <label>Размер шрифта: <input id="ls-fontSize" type="number" min="10" max="24"></label><br>
      <label><input id="ls-animations" type="checkbox"> Анимации</label><br><br>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button id="ls-save" class="ghost">Сохранить</button>
        <button id="ls-close" class="ghost">Закрыть</button>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('ls-gridWidth').value = state.settings.gridWidth;
    document.getElementById('ls-gridHeight').value = state.settings.gridHeight;
    document.getElementById('ls-fontSize').value = state.settings.fontSize;
    document.getElementById('ls-animations').checked = state.settings.animations;

    document.getElementById('ls-close').onclick = ()=>{ modal.remove(); };
    document.getElementById('ls-save').onclick = ()=>{
      const w = Math.max(7, parseInt(document.getElementById('ls-gridWidth').value,10) || defaults.gridWidth);
      const h = Math.max(5, parseInt(document.getElementById('ls-gridHeight').value,10) || defaults.gridHeight);
      state.settings.gridWidth = w;
      state.settings.gridHeight = h;
      state.settings.fontSize = parseInt(document.getElementById('ls-fontSize').value,10) || defaults.fontSize;
      state.settings.animations = !!document.getElementById('ls-animations').checked;
      saveSettings(state.settings);
      modal.remove();
      rebuildBoard();
    };
  }

  // simple buyFuel
  function buyFuel(){
    if(state.settings.balance >= state.settings.fuelPrice){
      state.settings.balance -= state.settings.fuelPrice;
      saveSettings(state.settings);
      updateBalanceUI();
      return true;
    }
    return false;
  }

  function updateBalanceUI(){
    let el = document.getElementById('ls-balance');
    if(!el){
      el = document.createElement('div');
      el.id = 'ls-balance';
      el.style.cssText = 'position:fixed;right:12px;top:12px;z-index:1200;color:var(--star);font-family:JetBrains Mono, monospace;background:rgba(255,255,255,.02);padding:6px;border:1px solid rgba(30,50,80,.25);';
      document.body.appendChild(el);
    }
    el.textContent = 'Баланс: ' + state.settings.balance;
  }

  // hex geometry helpers
  function hexPolygonPath(cx, cy, size){
    const points = [];
    for(let i=0;i<6;i++){
      const angle = Math.PI/180 * (60 * i - 30); // pointy-top
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      points.push(x + ',' + y);
    }
    return points.join(' ');
  }

  // board generation — SVG hex grid
  function generateHexGrid(cols, rows, size){
    const svgNS = 'http://www.w3.org/2000/svg';
    const hexW = size * 2;
    const hexH = Math.sqrt(3) * size;
    const horiz = size * 1.5; // horizontal distance between hex centers
    const vert = hexH; // vertical distance

    const width = Math.ceil((cols + 0.5) * horiz + size);
    const height = Math.ceil(rows * vert + hexH/2);

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('id','ls-board');
    svg.setAttribute('width','100%');
    svg.setAttribute('height','100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('id','ls-hexes');

    state.tiles = [];

    for(let r=0;r<rows;r++){
      for(let q=0;q<cols;q++){
        const cx = q * horiz + (r%2 ? horiz/2 : 0) + size;
        const cy = r * (hexH * 0.75) + size;

        // create polygon
        const poly = document.createElementNS(svgNS, 'polygon');
        const pts = hexPolygonPath(cx, cy, size);
        poly.setAttribute('points', pts);
        poly.setAttribute('fill', '#0b1322');
        poly.setAttribute('stroke', '#182641');
        poly.setAttribute('stroke-width', '1');
        poly.classList.add('ls-hex');
        poly.dataset.coord = q+','+r;
        poly.style.cursor = 'pointer';
        poly.addEventListener('click', onTileClick);
        group.appendChild(poly);

        // label
        const txt = document.createElementNS(svgNS, 'text');
        txt.setAttribute('x', cx);
        txt.setAttribute('y', cy + 2);
        txt.setAttribute('fill', '#7891b8');
        txt.setAttribute('font-size', Math.max(10, Math.min(14, state.settings.fontSize-2)));
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('dominant-baseline','central');
        txt.textContent = `${q},${r}`;
        group.appendChild(txt);

        state.tiles.push({q,r,poly,txt});
      }
    }

    svg.appendChild(group);
    return svg;
  }

  function onTileClick(e){
    const node = e.currentTarget;
    const coord = node.dataset.coord;
    console.log('Tile click', coord);
    node.setAttribute('fill','#101d31');
    node.setAttribute('stroke', state.settings.animations ? '#22d3ee' : '#245f62');
    node.setAttribute('stroke-width', '2');
    setTimeout(()=>{
      node.setAttribute('fill','#0b1322');
      node.setAttribute('stroke','#182641');
      node.setAttribute('stroke-width','1');
    }, 300);
  }

  function rebuildBoard(){
    const target = document.querySelector('.board-svg-wrap') || document.getElementById('remoteContainer') || document.body;
    const prev = document.getElementById('ls-board');
    if(prev && prev.parentNode) prev.parentNode.removeChild(prev);

    const size = 18; // hex radius
    const svg = generateHexGrid(state.settings.gridWidth, state.settings.gridHeight, size);

    if(target === document.getElementById('remoteContainer')){
      svg.style.width = '100%';
      svg.style.height = 'min(70vh, 600px)';
    }
    target.appendChild(svg);
    state.svgBoard = svg;
  }

  // Integration: bind to existing original SVG#board if present
  function integrateExistingBoard(){
    const orig = document.getElementById('board');
    if(!orig){
      console.warn('Оригинальный SVG #board не найден в DOM.');
      alert('Оригинальный SVG #board не найден в DOM. Убедитесь, что страница загружена.');
      return;
    }

    // Find hex polygons by class or by <g id="tiles"> pattern
    const hexes = orig.querySelectorAll('.hex, .hex-fog, polygon, path');
    if(!hexes || hexes.length === 0){
      console.warn('Не найдено очевидных hex-элементов внутри #board.');
      alert('Не найдено hex-элементов внутри #board.');
      return;
    }

    // Attach click handlers to shapes that look like tiles
    let bound = 0;
    hexes.forEach(node => {
      // skip if already bound
      if(node.dataset.lsbound) return;
      node.style.cursor = 'pointer';
      node.addEventListener('click', function(e){
        // small highlight animation
        const prevStroke = node.getAttribute('stroke');
        node.setAttribute('stroke', '#22d3ee');
        node.setAttribute('stroke-width', '2');
        setTimeout(()=>{
          if(prevStroke) node.setAttribute('stroke', prevStroke);
          node.setAttribute('stroke-width', '1');
        }, 300);
        // dispatch a custom event for higher-level logic
        const c = node.dataset.coord || node.getAttribute('data-coord') || '';
        window.dispatchEvent(new CustomEvent('ls:tileClick', { detail: { coord: c, node } }));
      });
      node.dataset.lsbound = '1';
      bound++;
    });

    console.info('Интеграция оригинального board: привязано', bound, 'элементов');
    alert('Интеграция оригинального board: привязано ' + bound + ' элементов');
  }

  // Disable keyboard controls by capturing keydown events at capture phase
  function toggleKeyboardBlocking(){
    if(state.keyboardDisabled){
      // remove blocker
      if(state.keyboardBlocker){
        window.removeEventListener('keydown', state.keyboardBlocker, true);
        state.keyboardBlocker = null;
      }
      state.keyboardDisabled = false;
      alert('Клавиатура включена');
      return;
    }

    const blocker = function(e){
      // Allow certain key combos if desired (e.g., Ctrl+F5) — currently block all
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    };

    window.addEventListener('keydown', blocker, true);
    state.keyboardBlocker = blocker;
    state.keyboardDisabled = true;
    alert('Клавиатура отключена (снятие через кнопку)');
  }

  // API exposure
  global.GAME.settings = state.settings;
  global.GAME.saveSettings = function(){ saveSettings(state.settings); };
  global.GAME.buyFuel = buyFuel;
  global.GAME.rebuildBoard = rebuildBoard;
  global.GAME.setBalance = function(v){ state.settings.balance = v; saveSettings(state.settings); updateBalanceUI(); };
  global.GAME.integrateExistingBoard = integrateExistingBoard;
  global.GAME.toggleKeyboardBlocking = toggleKeyboardBlocking;

  // init
  function init(){
    createControls();
    updateBalanceUI();
    setTimeout(()=>{ rebuildBoard(); }, 120);

    window.addEventListener('endTurn', (e)=>{
      console.info('Получено endTurn в GAME:', e.detail);
      state.settings.balance += 500;
      saveSettings(state.settings);
      updateBalanceUI();
    });

    // listen to custom tile click event from integrated board
    window.addEventListener('ls:tileClick', (e)=>{
      console.log('ls:tileClick', e.detail);
      // placeholder: you can hook game logic here
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else init();

})(window.GAME = window.GAME || {});
