(function(G){
  // Enable verbose debug logging by default for development sessions
  if(typeof window.GAME_DEBUG === 'undefined') window.GAME_DEBUG = true;
  const D = window.GAME_DEBUG;

  function dbg(){ if(D) console.debug.apply(console, arguments); }
  function info(){ console.info.apply(console, arguments); }
  function warn(){ console.warn.apply(console, arguments); }

  const Logic = {
    inTurn: false,
    turnOwner: null,
    init(){
      dbg('Logic: init — subscribing to events');
      window.addEventListener('game:tileClick', (e)=>{
        const d = e.detail || {};
        dbg('Logic: received game:tileClick', d);
        // simple default behavior: attempt to 'inspect' or 'attack' depending on modifier
        const coord = d.coord || '';
        // For demo: single-click triggers 'inspect', shift+click triggers 'attack' (if keyboard info provided)
        // We can't reliably read keyboard state here; assume UI will call attemptAction directly for real actions.
        Logic.attemptAction('player', { type: 'inspect' , coord}, {}).catch(err=>{
          warn('Logic: action failed', err);
        });
      });

      window.addEventListener('endTurn', (e)=>{
        info('Logic: endTurn event received', e.detail);
        Logic.handleEndTurn(e.detail);
      });

      // expose for debugging
      G.Logic = Logic;
      dbg('Logic: initialized');
    },

    async attemptAction(actor, action, opts){
      // action: { type: 'move'|'attack'|'inspect'|'buy' , coord: 'q,r', payload: {} }
      dbg('Logic: attemptAction actor=', actor, 'action=', action, 'opts=', opts);
      const valid = Logic.validateAction(actor, action);
      if(!valid.allowed){
        warn('Logic: action validation failed', valid.reason);
        return Promise.reject(new Error(valid.reason || 'action not allowed'));
      }

      // apply
      const result = Logic.applyAction(actor, action);
      // after applying, save state and notify
      try{
        if(G.State && typeof G.State.save === 'function') G.State.save();
        window.dispatchEvent(new CustomEvent('game:actionApplied', { detail: { actor, action, result } }));
        if(D) console.debug('Logic: actionApplied', { actor, action, result });
        // notify balance changed if relevant
        if(result && result.balanceChanged){
          window.dispatchEvent(new CustomEvent('game:balanceChanged', { detail: { balance: (G.State && G.State.settings && G.State.settings().balance) } }));
        }
        return Promise.resolve(result);
      }catch(e){
        warn('Logic: error saving state after action', e);
        return Promise.reject(e);
      }
    },

    validateAction(actor, action){
      // Very simple placeholder validations. Real rules should be implemented here.
      if(!action || !action.type) return { allowed:false, reason:'no_action' };
      const t = action.type;
      if(t === 'buy'){
        const s = (G.State && typeof G.State.settings === 'function') ? G.State.settings() : {}; 
        if((s.balance || 0) < (s.fuelPrice || 0)) return { allowed:false, reason:'not_enough_money' };
        return { allowed:true };
      }
      // move/attack/inspect allowed by default in demo
      return { allowed:true };
    },

    applyAction(actor, action){
      // Apply and return result summary object
      const t = action.type;
      dbg('Logic: applyAction', actor, action);
      if(t === 'inspect'){
        // no state change — return info for UI
        return { ok:true, message:'inspected', coord: action.coord };
      }
      if(t === 'buy'){
        const s = (G.State && typeof G.State.settings === 'function') ? G.State.settings() : {};
        const price = s.fuelPrice || 0;
        if((s.balance || 0) >= price){
          s.balance -= price;
          if(G.State && typeof G.State.save === 'function') G.State.save();
          info(`Logic: buy action applied — balance now ${s.balance}`);
          return { ok:true, balanceChanged:true, newBalance: s.balance };
        }
        return { ok:false, reason:'not_enough_money' };
      }
      if(t === 'attack'){
        // simplistic damage application example
        const damage = (action.payload && action.payload.damage) || 10;
        // In real game we'd find unit at action.coord and subtract HP
        info(`Logic: attack at ${action.coord} by ${actor}, damage=${damage}`);
        // send visual cue to board
        if(G.Board && typeof G.Board.highlightTile === 'function'){
          G.Board.highlightTile(action.coord, { color:'#ef6a6a', duration: 600 });
        }
        return { ok:true, damageApplied:damage };
      }
      if(t === 'move'){
        // placeholder move
        info(`Logic: move to ${action.coord} by ${actor}`);
        if(G.Board && typeof G.Board.highlightTile === 'function'){
          G.Board.highlightTile(action.coord, { color:'#5eead4', duration: 400 });
        }
        return { ok:true };
      }

      return { ok:false, reason:'unknown_action' };
    },

    handleEndTurn(detail){
      // Example: endTurn increments internal counters or rotates owner
      info('Logic: handling end of turn — detail=', detail);
      // For demo: dispatch summary
      window.dispatchEvent(new CustomEvent('game:turnEnded', { detail: { ts: Date.now() } }));
    }
  };

  // auto-init
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>Logic.init());
  else Logic.init();

})(window.GAME = window.GAME || {});
