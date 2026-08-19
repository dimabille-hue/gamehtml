(function(G){
  // Game logic with simple unit model, turns, and detailed debug logging
  if(typeof window.GAME_DEBUG === 'undefined') window.GAME_DEBUG = true;
  const D = window.GAME_DEBUG;
  const dbg = (...args) => { if(window.GAME_DEBUG) console.debug(...args); };
  const info = (...args) => console.info(...args);
  const warn = (...args) => console.warn(...args);

  const Logic = {
    units: {}, // map coord -> unit object {id, owner, hp, maxHp, coord}
    nextUnitId: 1,
    inTurn: false,
    turnOwner: null,

    init(){
      dbg('Logic:init — registering handlers');
      window.addEventListener('game:tileClick', (e)=>{
        const d = e.detail || {};
        dbg('Logic: game:tileClick', d);
        // Default UI interaction: inspect
        Logic.attemptAction('player', { type: 'inspect', coord: d.coord }, {}).catch(err=> dbg('Logic:inspect failed', err));
      });

      window.addEventListener('endTurn', (e)=>{
        info('Logic: endTurn received', e.detail);
        Logic.handleEndTurn(e.detail);
      });

      G.Logic = Logic;
      dbg('Logic:init done');
    },

    snapshot(){
      return { units: Object.values(Logic.units).map(u=>Object.assign({},u)), inTurn: Logic.inTurn, turnOwner: Logic.turnOwner };
    },

    spawnUnit(coord, owner, opts){
      const id = 'u' + (Logic.nextUnitId++);
      const unit = { id, owner: owner || 'npc', coord: coord, hp: (opts && opts.hp) || 100, maxHp: (opts && opts.maxHp) || 100 };
      Logic.units[coord] = unit;
      info('Logic: spawnUnit', unit);
      // visual feedback
      if(G.Board && typeof G.Board.highlightTile === 'function') G.Board.highlightTile(coord, { color: '#7ee787', duration: 800 });
      return unit;
    },

    getUnitAt(coord){
      return Logic.units[coord] || null;
    },

    removeUnit(coord){
      const u = Logic.units[coord];
      if(u){ delete Logic.units[coord]; info('Logic: removeUnit', u); }
      return u;
    },

    attemptAction(actor, action, opts){
      dbg('Logic: attemptAction', { actor, action, opts });
      const valid = Logic.validateAction(actor, action);
      if(!valid.allowed) return Promise.reject(new Error(valid.reason || 'not_allowed'));
      try{
        const res = Logic.applyAction(actor, action);
        if(G.State && typeof G.State.save === 'function') G.State.save();
        window.dispatchEvent(new CustomEvent('game:actionApplied', { detail: { actor, action, result: res } }));
        if(res && res.balanceChanged) window.dispatchEvent(new CustomEvent('game:balanceChanged', { detail: { balance: (G.State && G.State.settings && G.State.settings().balance) } }));
        dbg('Logic: action applied', res);
        return Promise.resolve(res);
      }catch(e){
        warn('Logic: applyAction error', e);
        return Promise.reject(e);
      }
    },

    validateAction(actor, action){
      if(!action || !action.type) return { allowed:false, reason:'no_action' };
      const t = action.type;
      if(t === 'buy'){
        const s = (G.State && typeof G.State.settings === 'function') ? G.State.settings() : {}; 
        if((s.balance || 0) < (s.fuelPrice || 0)) return { allowed:false, reason:'not_enough_money' };
        return { allowed:true };
      }
      if(t === 'attack'){
        const target = Logic.getUnitAt(action.coord);
        if(!target) return { allowed:false, reason:'no_target' };
        return { allowed:true };
      }
      // default allow
      return { allowed:true };
    },

    applyAction(actor, action){
      const t = action.type;
      dbg('Logic: applyAction', action);
      if(t === 'inspect'){
        const unit = Logic.getUnitAt(action.coord);
        return { ok:true, inspected: !!unit, unit: unit ? Object.assign({},unit) : null };
      }
      if(t === 'buy'){
        const s = (G.State && typeof G.State.settings === 'function') ? G.State.settings() : {};
        const price = s.fuelPrice || 0;
        if((s.balance || 0) >= price){
          s.balance -= price;
          if(G.State && typeof G.State.save === 'function') G.State.save();
          info('Logic: buy applied, new balance=', s.balance);
          return { ok:true, balanceChanged:true, newBalance: s.balance };
        }
        return { ok:false, reason:'not_enough_money' };
      }
      if(t === 'move'){
        // move unit (if actor owns unit at origin)
        const from = action.from; const to = action.coord;
        const unit = Logic.getUnitAt(from);
        if(!unit) return { ok:false, reason:'no_unit_at_from' };
        if(unit.owner !== actor) return { ok:false, reason:'not_owner' };
        delete Logic.units[from];
        unit.coord = to;
        Logic.units[to] = unit;
        info(`Logic: moved unit ${unit.id} from ${from} to ${to}`);
        if(G.Board && typeof G.Board.highlightTile === 'function') G.Board.highlightTile(to, { color:'#5eead4', duration:400 });
        return { ok:true, moved:unit.id };
      }
      if(t === 'attack'){
        const target = Logic.getUnitAt(action.coord);
        const dmg = (action.payload && action.payload.damage) || 20;
        if(!target) return { ok:false, reason:'no_target' };
        target.hp -= dmg;
        info(`Logic: attack applied on ${target.id} at ${action.coord}, dmg=${dmg}, hp=${target.hp}`);
        if(G.Board && typeof G.Board.highlightTile === 'function') G.Board.highlightTile(action.coord, { color:'#ef6a6a', duration:600 });
        const died = target.hp <= 0;
        if(died){ Logic.removeUnit(action.coord); info('Logic: unit died', target.id); }
        return { ok:true, damage:dmg, targetId: target.id, died };
      }
      return { ok:false, reason:'unknown_action' };
    },

    handleEndTurn(detail){
      info('Logic: handleEndTurn — rotating turn or applying upkeep (demo)');
      // demo: simply toggle turnOwner for visibility
      Logic.turnOwner = (Logic.turnOwner === 'player') ? 'npc' : 'player';
      info('Logic: new turnOwner=', Logic.turnOwner);
      window.dispatchEvent(new CustomEvent('game:turnEnded', { detail: { owner: Logic.turnOwner } }));
    }
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>Logic.init()); else Logic.init();

})(window.GAME = window.GAME || {});
