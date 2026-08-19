(function(G){
  // Debug helper: toggles verbose logging (window.GAME_DEBUG) and shows a small control in the UI controls area
  if(typeof window.GAME_DEBUG === 'undefined') window.GAME_DEBUG = true;

  function createDebugToggle(){
    // wait until controls exist
    function attach(){
      const controls = document.getElementById('ls-ui-controls') || document.getElementById('ls-controls');
      if(!controls) return setTimeout(attach, 200);

      if(document.getElementById('ls-debug-toggle')) return;

      const btn = document.createElement('button');
      btn.id = 'ls-debug-toggle';
      btn.className = 'ghost';
      function updateLabel(){ btn.textContent = (window.GAME_DEBUG ? 'Debug: ON' : 'Debug: OFF'); }
      updateLabel();

      btn.onclick = ()=>{
        window.GAME_DEBUG = !window.GAME_DEBUG;
        updateLabel();
        console.info('GAME_DEBUG is now', window.GAME_DEBUG);
        // dispatch event for other modules to react
        window.dispatchEvent(new CustomEvent('game:debugToggled', { detail: { enabled: window.GAME_DEBUG } }));
      };

      controls.appendChild(btn);
    }
    attach();
  }

  // expose simple API
  G.Debug = {
    enabled(){ return !!window.GAME_DEBUG; },
    toggle(){ window.GAME_DEBUG = !window.GAME_DEBUG; window.dispatchEvent(new CustomEvent('game:debugToggled',{detail:{enabled:window.GAME_DEBUG}})); }
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createDebugToggle);
  else createDebugToggle();

})(window.GAME = window.GAME || {});
