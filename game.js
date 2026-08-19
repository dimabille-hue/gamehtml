// game.js — entry point that coordinates State, Board and UI modules
(function(G){
  function init(){
    // Initialize state first
    if(G.State && typeof G.State.init === 'function') G.State.init();

    // Initialize UI (controls, modals)
    if(G.UI && typeof G.UI.init === 'function') G.UI.init();

    // Build board from current settings
    const s = (G.State && typeof G.State.settings === 'function') ? G.State.settings() : (G.settings || {});
    const cols = s.gridWidth || 11;
    const rows = s.gridHeight || 9;
    const size = 18;

    if(G.Board && typeof G.Board.rebuild === 'function'){
      G.Board.rebuild(cols, rows, size, null);
      // forward board clicks to higher-level logic
      G.Board.onTileClick((coord, node)=>{
        // dispatch a custom event for compatibility with existing listeners
        window.dispatchEvent(new CustomEvent('game:tileClick', { detail: { coord, node } }));
        console.log('game:tileClick', coord);
      });
    }

    // Wire integrated board clicks (from original #board) to same handler
    window.addEventListener('ls:tileClick', (e)=>{
      const detail = e.detail || {};
      window.dispatchEvent(new CustomEvent('game:tileClick', { detail }));
    });

    // Example: listen game:tileClick for debug
    window.addEventListener('game:tileClick', (e)=>{
      console.log('Received game:tileClick', e.detail);
      // highlight clicked tile in generated board if possible
      if(G.Board && typeof G.Board.highlightTile === 'function'){
        const c = e.detail && e.detail.coord;
        if(c) G.Board.highlightTile(c, { duration: 400 });
      }
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(window.GAME = window.GAME || {});
