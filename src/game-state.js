window.GAME = window.GAME || {};

(function(G){
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

  function saveSettings(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }catch(e){
      console.warn('Ошибка сохранения настроек', e);
    }
  }

  let settings = loadSettings();

  const State = {
    init(){
      settings = loadSettings();
      // expose simple handle
      G.settings = settings;

      // example endTurn listener to reward player
      window.addEventListener('endTurn', (e)=>{
        console.info('State: обработка endTurn', e.detail);
        settings.balance = (settings.balance || 0) + 500;
        saveSettings();
        if(G.UI && typeof G.UI.updateBalanceUI === 'function') G.UI.updateBalanceUI();
      });
    },
    settings(){ return settings; },
    save(){ saveSettings(); },
    buyFuel(){
      if(settings.balance >= settings.fuelPrice){
        settings.balance -= settings.fuelPrice;
        saveSettings();
        if(G.UI && typeof G.UI.updateBalanceUI === 'function') G.UI.updateBalanceUI();
        return true;
      }
      return false;
    },
    setBalance(v){
      settings.balance = v;
      saveSettings();
      if(G.UI && typeof G.UI.updateBalanceUI === 'function') G.UI.updateBalanceUI();
    }
  };

  G.State = State;

})(window.GAME);
