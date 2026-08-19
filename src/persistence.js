(function(G){
  // Persist unit registry in State and auto-render after actions
  // Hook into Logic.actionApplied to update board rendering and persist units
  function persistUnits(){
    if(!G.Logic) return;
    const snap = G.Logic.snapshot();
    const units = snap.units || [];
    const s = (G.State && typeof G.State.settings === 'function') ? G.State.settings() : null;
    if(s){
      s._units = units;
      if(typeof G.State.save === 'function') G.State.save();
      if(window.GAME_DEBUG) console.debug('Persisted units to state', units);
    }
  }

  function restoreUnits(){
    if(!G.Logic) return;
    const s = (G.State && typeof G.State.settings === 'function') ? G.State.settings() : null;
    if(s && Array.isArray(s._units)){
      // clear existing
      G.Logic.units = {};
      s._units.forEach(u => { G.Logic.units[u.coord] = u; });
      if(G.Board && typeof G.Board.renderUnits === 'function') G.Board.renderUnits(s._units);
      if(window.GAME_DEBUG) console.debug('Restored units from state', s._units);
    }
  }

  // attach handlers
  window.addEventListener('game:actionApplied', ()=>{
    try{ if(G.Board && typeof G.Board.renderUnits === 'function') G.Board.renderUnits(G.Logic.snapshot().units); }catch(e){ console.warn('renderUnits failed',e); }
    try{ persistUnits(); }catch(e){ console.warn('persistUnits failed', e); }
  });

  // restore on load
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restoreUnits);
  else restoreUnits();

  // expose utility
  G.Persistence = { persistUnits, restoreUnits };

})(window.GAME = window.GAME || {});
