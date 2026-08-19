(function(G){
  const svgNS = 'http://www.w3.org/2000/svg';

  let state = {
    svgBoard: null,
    tiles: [],
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

    return { poly, txt };
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

    function onTileClick(e){
      const node = e.currentTarget;
      const coord = node.dataset.coord;
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
        group.appendChild(t.poly);
        group.appendChild(t.txt);
        tiles.push({ q, r, poly: t.poly, txt: t.txt });
      }
    }

    svg.appendChild(group);
    state.tiles = tiles;
    state.svgBoard = svg;
    return svg;
  }

  function rebuild(cols, rows, size, targetSelector){
    const target = document.querySelector(targetSelector || '.board-svg-wrap') || document.body;
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

  function highlightTile(coord, opts){
    if(!coord) return;
    const node = state.tiles.find(t => `${t.q},${t.r}` === coord);
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
    _internal_state: state
  };

})(window.GAME = window.GAME || {});
