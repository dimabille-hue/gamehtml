(function(G){
  // UI module: controls, settings modal and balance UI
  function createControls(){
    if(document.getElementById('ls-ui-controls')) return;

    const container = document.createElement('div');
    container.id = 'ls-ui-controls';
    container.style.cssText = 'position:fixed;left:12px;top:12px;z-index:1300;display:flex;gap:8px;';

    const btnSettings = document.createElement('button');
    btnSettings.textContent = 'Настройки';
    btnSettings.className = 'ghost';
    btnSettings.onclick = openSettings;

    const btnEndTurn = document.createElement('button');
    btnEndTurn.textContent = 'Конец хода';
    btnEndTurn.className = 'ghost';
    btnEndTurn.onclick = ()=>{ window.dispatchEvent(new CustomEvent('endTurn',{detail:{ts:Date.now()}})); };

    const btnBuyFuel = document.createElement('button');
    btnBuyFuel.textContent = 'Купить топливо';
    btnBuyFuel.className = 'ghost';
    btnBuyFuel.onclick = ()=>{
      if(G.State && typeof G.State.buyFuel === 'function'){
        const ok = G.State.buyFuel();
        if(!ok) alert('Недостаточно средств для покупки топлива.');
      }
    };

    const btnIntegrate = document.createElement('button');
    btnIntegrate.textContent = 'Интегрировать Board';
    btnIntegrate.className = 'ghost';
    btnIntegrate.onclick = ()=>{
      if(G.Board && typeof G.Board.integrateExistingBoard === 'function'){
        const bound = G.Board.integrateExistingBoard();
        alert('Интеграция: привязано ' + bound + ' элементов');
      } else alert('Board модуль не найден.');
    };

    const btnKb = document.createElement('button');
    btnKb.textContent = 'Откл. клавиатуру';
    btnKb.className = 'ghost';
    btnKb.onclick = toggleKeyboardBlocking;

    container.appendChild(btnSettings);
    container.appendChild(btnEndTurn);
    container.appendChild(btnBuyFuel);
    container.appendChild(btnIntegrate);
    container.appendChild(btnKb);

    document.body.appendChild(container);

    // balance display
    updateBalanceUI();
  }

  // simple keyboard blocker
  let keyboardBlocked = false;
  let kbHandler = null;
  function toggleKeyboardBlocking(){
    if(keyboardBlocked){
      if(kbHandler) window.removeEventListener('keydown', kbHandler, true);
      kbHandler = null;
      keyboardBlocked = false;
      alert('Клавиатура включена');
      return;
    }
    kbHandler = function(e){ e.stopImmediatePropagation(); e.preventDefault(); return false; };
    window.addEventListener('keydown', kbHandler, true);
    keyboardBlocked = true;
    alert('Клавиатура отключена (снятие через кнопку)');
  }

  function updateBalanceUI(){
    let el = document.getElementById('ls-balance');
    if(!el){
      el = document.createElement('div');
      el.id = 'ls-balance';
      el.style.cssText = 'position:fixed;right:12px;top:12px;z-index:1300;padding:6px;background:rgba(255,255,255,.02);border:1px solid rgba(30,50,80,.18);font-family:JetBrains Mono,monospace;color:#e8ecf5;';
      document.body.appendChild(el);
    }
    const s = (G.State && typeof G.State.settings === 'function') ? G.State.settings() : (G.settings || {});
    const bal = (s && s.balance != null) ? s.balance : 0;
    const price = (s && s.fuelPrice != null) ? s.fuelPrice : '—';
    el.textContent = `Баланс: ${bal} — Цена топлива: ${price}`;
  }

  function openSettings(){
    if(document.getElementById('ls-settings-modal')) return;
    const s = (G.State && typeof G.State.settings === 'function') ? G.State.settings() : (G.settings || {});

    const modal = document.createElement('div');
    modal.id = 'ls-settings-modal';
    modal.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1400;padding:12px;background:rgba(6,10,18,.98);border:1px solid rgba(80,110,160,.12);min-width:320px;color:#e8ecf5;font-family:Rajdhani, sans-serif;';

    modal.innerHTML = `
      <h3 style="margin:0 0 8px 0;font-family:Orbitron, sans-serif;">Настройки игры</h3>
      <label style="display:block;margin:6px 0">Ширина: <input id="ls-set-width" type="number" min="7" max="40" style="width:80px"></label>
      <label style="display:block;margin:6px 0">Высота: <input id="ls-set-height" type="number" min="5" max="30" style="width:80px"></label>
      <label style="display:block;margin:6px 0">Размер шрифта: <input id="ls-set-font" type="number" min="10" max="24" style="width:80px"></label>
      <label style="display:block;margin:6px 0"><input id="ls-set-anim" type="checkbox"> Анимации</label>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button id="ls-settings-cancel" class="ghost">Отмена</button>
        <button id="ls-settings-save" class="ghost">Сохранить</button>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('ls-set-width').value = s.gridWidth || 11;
    document.getElementById('ls-set-height').value = s.gridHeight || 9;
    document.getElementById('ls-set-font').value = s.fontSize || 14;
    document.getElementById('ls-set-anim').checked = !!s.animations;

    document.getElementById('ls-settings-cancel').onclick = ()=>{ modal.remove(); };
    document.getElementById('ls-settings-save').onclick = ()=>{
      const w = Math.max(7, parseInt(document.getElementById('ls-set-width').value,10) || 11);
      const h = Math.max(5, parseInt(document.getElementById('ls-set-height').value,10) || 9);
      const f = Math.max(10, parseInt(document.getElementById('ls-set-font').value,10) || 14);
      const a = !!document.getElementById('ls-set-anim').checked;

      if(G.State && typeof G.State.settings === 'function'){
        const settingsObj = G.State.settings();
        settingsObj.gridWidth = w;
        settingsObj.gridHeight = h;
        settingsObj.fontSize = f;
        settingsObj.animations = a;
        if(typeof G.State.save === 'function') G.State.save();
      } else {
        // fallback
        if(window.GAME && window.GAME.settings){
          window.GAME.settings.gridWidth = w;
          window.GAME.settings.gridHeight = h;
          window.GAME.settings.fontSize = f;
          window.GAME.settings.animations = a;
          if(window.GAME.saveSettings) window.GAME.saveSettings();
        }
      }

      // rebuild board with new settings
      if(G.Board && typeof G.Board.rebuild === 'function'){
        G.Board.rebuild(w,h,18);
      }

      updateBalanceUI();
      modal.remove();
    };
  }

  function init(){
    createControls();
    updateBalanceUI();

    // listen to endTurn to refresh balance UI
    window.addEventListener('endTurn', ()=>{ setTimeout(updateBalanceUI, 120); });
    // listen to custom events from game modules
    window.addEventListener('game:balanceChanged', ()=>{ updateBalanceUI(); });
  }

  G.UI = {
    init,
    updateBalanceUI,
    openSettings
  };

  // auto init
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(window.GAME = window.GAME || {});
