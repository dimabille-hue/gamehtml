(function(G){
  const svgNS = 'http://www.w3.org/2000/svg';

  let state = {
    svgBoard: null,
    tiles: [],
    tileMap: {},
    tileClickCb: null
  };

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

  function createTile(q,r,size, cx, cy, onClick, settings){
    const poly = document.createElementNS(svgNS,'polygon');
    const pts = hexPolygonPath(cx, cy, size);
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', '#0b1322');
    poly.setAttribute('stroke', '#182641');
    poly.setAttribute('stroke-width', '1');
    poly.classList.add('ls-hex');
    poly.dataset.coord = q+','+r;
    poly.style.cursor = 'pointer';
    poly.addEventListener('click', onClick);

    const txt = document.createElementNS(svgNS,'text');
    txt.setAttribute('x', cx);
    txt.setAttribute('y', cy + 2);
    txt.setAttribute('fill', '#7891b8');
    txt.setAttribute('font-size', Math.max(10, Math.min(14, (settings&&settings.fontSize)||14)-2));
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('dominant-baseline','central');
    txt.textContent = `${q},${r}`;

    const group = document.createElementNS(svgNS,'g');
    group.setAttribute('data-coord', q+','+r);
    group.appendChild(poly);
    group.appendChild(txt);

    return { q, r, group, poly, txt };
  }

  function generateHexGrid(cols, rows, size, settings){
    const hexH = Math.sqrt(3) * size;
    const horiz = size * 1.5;
    const vert = hexH * 0.75;

    const width = Math.ceil((cols + 0.5) * horiz + size);
    const height = Math.ceil(rows * hexH + hexH/2);

    const svg = document.createElementNS(svgNS,'svg');
    svg.setAttribute('id','ls-board');
    svg.setAttribute('width','100%');
    svg.setAttribute('height','100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const group = document.createElementNS(svgNS,'g');
    group.setAttribute('id','ls-hexes');

    const tiles = [];
    const tileMap = {};

    function onTileClick(e){
      const node = e.currentTarget;
      const coord = node.dataset.coord || node.parentNode && node.parentNode.dataset && node.parentNode.dataset.coord;
      console.log('Tile click', coord);
      // trigger public callback if any
      if(state.tileClickCb) state.tileClickCb(coord, node);

      // quick visual feedback
      const prevFill = node.getAttribute('fill');
      const prevStroke = node.getAttribute('stroke');
      node.setAttribute('fill','#101d31');
      node.setAttribute('stroke','#22d3ee');
      node.setAttribute('stroke-width','2');
      setTimeout(()=>{
        node.setAttribute('fill', prevFill || '#0b1322');
        node.setAttribute('stroke', prevStroke || '#182641');
        node.setAttribute('stroke-width','1');
      }, 300);
    }

    for(let r=0;r<rows;r++){
      for(let q=0;q<cols;q++){
        const cx = q * horiz + ((r%2) ? horiz/2 : 0) + size;
        const cy = r * vert + size;
        const t = createTile(q,r,size,cx,cy,onTileClick,settings);
        group.appendChild(t.group);
        tiles.push({ q: t.q, r: t.r, poly: t.poly, txt: t.txt, group: t.group, unitEl: null });
        tileMap[`${t.q},${t.r}`] = tiles[tiles.length-1];
      }
    }

    svg.appendChild(group);
    state.tiles = tiles;
    state.tileMap = tileMap;
    state.svgBoard = svg;
    return svg;
  }

  function rebuild(cols, rows, size, targetSelector){
    const target = document.querySelector(targetSelector || '.board-svg-wrap') || document.getElementById('board-root') || document.body;
    const prev = document.getElementById('ls-board');
    if(prev && prev.parentNode) prev.parentNode.removeChild(prev);
    const settings = (G.State && typeof G.State.settings === 'function') ? G.State.settings() : {};
    const svg = generateHexGrid(cols, rows, size, settings);
    if(target === document.getElementById('remoteContainer')){
      svg.style.width = '100%';
      svg.style.height = 'min(70vh, 600px)';
    }
    target.appendChild(svg);
  }

  function integrateExistingBoard(){
    const orig = document.getElementById('board');
    if(!orig){
      console.warn('Интеграция: оригинальный SVG #board не найден');
      return 0;
    }

    const hexes = orig.querySelectorAll('.hex, .hex-fog, polygon, path');
    if(!hexes || hexes.length === 0){
      console.warn('Интеграция: не найдены элементы тайлов внутри #board');
      return 0;
    }

    let bound = 0;
    hexes.forEach(node => {
      if(node.dataset.lsbound) return;
      node.style.cursor = 'pointer';
      node.addEventListener('click', function(e){
        const prevStroke = node.getAttribute('stroke');
        node.setAttribute('stroke', '#22d3ee');
        node.setAttribute('stroke-width', '2');
        setTimeout(()=>{
          if(prevStroke) node.setAttribute('stroke', prevStroke);
          node.setAttribute('stroke-width', '1');
        }, 300);
        const c = node.dataset.coord || node.getAttribute('data-coord') || '';
        if(state.tileClickCb) state.tileClickCb(c, node);
        window.dispatchEvent(new CustomEvent('ls:tileClick', { detail: { coord: c, node } }));
      });
      node.dataset.lsbound = '1';
      bound++;
    });

    console.info('Интеграция оригинального board: привязано', bound, 'элементов');
    return bound;
  }

  function clearUnitsRender(){
    Object.values(state.tileMap).forEach(t => {
      if(t.unitEl && t.unitEl.parentNode) t.unitEl.parentNode.removeChild(t.unitEl);
      t.unitEl = null;
    });
  }

  function renderUnits(units){
    // units: array of { id, owner, coord, hp }
    if(!state.tileMap) return;
    clearUnitsRender();
    units = units || [];
    units.forEach(u => {
      const t = state.tileMap[u.coord];
      if(!t) return;
      const g = document.createElementNS(svgNS, 'g');
      g.classList.add('unit');
      // position center: find centroid of polygon points
      // simpler: reuse text coords
      const x = parseFloat(t.txt.getAttribute('x')) || 0;
      const y = parseFloat(t.txt.getAttribute('y')) || 0;

      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y - 10);
      circle.setAttribute('r', 8);
      circle.setAttribute('fill', u.owner === 'player' ? '#5eead4' : '#f0a868');
      circle.setAttribute('stroke', '#222');
      circle.setAttribute('stroke-width','1');

      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', y - 6);
      label.setAttribute('fill', '#041224');
      label.setAttribute('font-size', '8');
      label.setAttribute('text-anchor','middle');
      label.setAttribute('dominant-baseline','central');
      label.textContent = u.hp;

      g.appendChild(circle);
      g.appendChild(label);
      t.group.appendChild(g);
      t.unitEl = g;
    });
  }

  function highlightTile(coord, opts){
    if(!coord) return;
    const node = state.tileMap[coord];
    if(node){
      node.poly.setAttribute('stroke', (opts && opts.color) || '#22d3ee');
      node.poly.setAttribute('stroke-width', '2');
      if(opts && opts.duration){
        setTimeout(()=>{
          node.poly.setAttribute('stroke','#182641');
          node.poly.setAttribute('stroke-width','1');
        }, opts.duration);
      }
    }
  }

  function onTileClick(cb){ state.tileClickCb = cb; }

  // public API
  G.Board = {
    rebuild(cols, rows, size, targetSelector){ rebuild(cols, rows, size || 18, targetSelector); },
    integrateExistingBoard,
    highlightTile,
    onTileClick,
    renderUnits,
    clearUnitsRender,
    _internal_state: state
  };

})(window.GAME = window.GAME || {});
