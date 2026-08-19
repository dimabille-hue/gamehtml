// game.js — каркас для постепенного переноса логики игры

const STORAGE_KEY = 'gamehtml.settings.v1';

const defaultSettings = {
  sessionMinutes: 5,
  gridWidth: 9,
  gridHeight: 9,
  animations: true,
  fontSize: 14,
  balance: 0, // не деньги игрока, а внутриигровой счёт (используется для покупок)
  fuelPrice: 1000
};

let settings = loadSettings();
let state = {
  balance: 0
};

function loadSettings(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return Object.assign({}, defaultSettings, JSON.parse(raw));
  }catch(e){console.warn('Ошибка чтения настроек',e)}
  return Object.assign({}, defaultSettings);
}

function saveSettings(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }catch(e){console.warn('Ошибка сохранения настроек',e)}
}

function init(){
  // Инициализация состояния
  state.balance = 0; // пока 0 — покупки топлива будут приниматься при наличии средств

  // UI: кнопка настроек
  const btn = document.createElement('button');
  btn.className = 'settings-btn';
  btn.textContent = 'Настройки';
  btn.addEventListener('click', ()=>openSettings());
  document.body.appendChild(btn);

  // баланс
  const bal = document.createElement('div');
  bal.className = 'balance-indicator';
  bal.id = 'balanceIndicator';
  updateBalanceUI();
  document.body.appendChild(bal);

  // Модальное окно настроек
  buildSettingsModal();
}

function updateBalanceUI(){
  const el = document.getElementById('balanceIndicator');
  if(!el) return;
  el.textContent = `Баланс: ${state.balance} (Цена топлива: ${settings.fuelPrice})`;
}

function openSettings(){
  const modal = document.querySelector('.settings-modal');
  if(!modal) return;
  modal.classList.add('open');
}

function closeSettings(){
  const modal = document.querySelector('.settings-modal');
  if(!modal) return;
  modal.classList.remove('open');
}

function buildSettingsModal(){
  const modal = document.createElement('div');
  modal.className = 'settings-modal';

  const title = document.createElement('h3');
  title.textContent = 'Настройки игры';
  modal.appendChild(title);

  // sessionMinutes
  modal.appendChild(renderNumberSetting('Время сессии (мин)', 'sessionMinutes', settings.sessionMinutes));
  modal.appendChild(renderNumberSetting('Ширина сетки', 'gridWidth', settings.gridWidth, 9));
  modal.appendChild(renderNumberSetting('Высота сетки', 'gridHeight', settings.gridHeight, 9));
  modal.appendChild(renderNumberSetting('Размер шрифта (px)', 'fontSize', settings.fontSize, 10));

  // анимации
  const animRow = document.createElement('div');
  animRow.className = 'settings-row';
  const animLabel = document.createElement('label');
  animLabel.textContent = 'Анимации';
  animRow.appendChild(animLabel);
  const animSel = document.createElement('select');
  animSel.innerHTML = `<option value="true">Вкл</option><option value="false">Выкл</option>`;
  animSel.value = String(settings.animations);
  animSel.addEventListener('change', ()=>{
    settings.animations = (animSel.value === 'true');
    saveSettings();
  });
  animRow.appendChild(animSel);
  modal.appendChild(animRow);

  // actions
  const actions = document.createElement('div');
  actions.className = 'settings-actions';
  const btnSave = document.createElement('button');
  btnSave.textContent = 'Сохранить';
  btnSave.addEventListener('click', ()=>{
    // прочитать inputs
    const nms = modal.querySelectorAll('[data-setting]');
    nms.forEach(n => {
      const key = n.getAttribute('data-setting');
      let val = Number(n.value);
      if(!isNaN(val)) settings[key] = val;
    });
    saveSettings();
    closeSettings();
    alert('Настройки сохранены. Перегенерация поля при следующем шаге.');
  });
  const btnClose = document.createElement('button');
  btnClose.textContent = 'Закрыть';
  btnClose.addEventListener('click', ()=>closeSettings());
  actions.appendChild(btnClose);
  actions.appendChild(btnSave);
  modal.appendChild(actions);

  document.body.appendChild(modal);
}

function renderNumberSetting(labelText, key, value, min=0){
  const row = document.createElement('div');
  row.className = 'settings-row';
  const label = document.createElement('label');
  label.textContent = labelText;
  row.appendChild(label);
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.value = String(value);
  input.setAttribute('data-setting', key);
  row.appendChild(input);
  return row;
}

// Покупка топлива (используется в следующих шагах) — цена settings.fuelPrice
function buyFuel(){
  if(state.balance >= settings.fuelPrice){
    state.balance -= settings.fuelPrice;
    updateBalanceUI();
    return true;
  }
  alert('Недостаточно средств для покупки топлива.');
  return false;
}

// Инициализация
window.addEventListener('DOMContentLoaded', ()=>{
  init();
});
