// game.js — доработка: добавлен параметрический генератор поля (placeholder), кнопка "Конец хода" и применение настроек

const STORAGE_KEY = 'gamehtml.settings.v1';

const defaultSettings = {
  sessionMinutes: 5,
  gridWidth: 9,
  gridHeight: 9,
  animations: true,
  fontSize: 14,
  balance: 0,
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
  state.balance = settings.balance || 0;

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

  // Кнопка "Конец хода"
  createEndTurnButton();

  // Модальное окно настроек
  buildSettingsModal();

  // Первичная генерация поля
  applySettings();
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
  // если уже добавлен — не дублируем
  if(document.querySelector('.settings-modal')) return;

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
    applySettings();
    alert('Настройки сохранены и применены.');
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

// Кнопка "Конец хода" — простая реализация, генерирует событие 'endTurn'
function createEndTurnButton(){
  if(document.getElementById('endTurnBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'endTurnBtn';
  btn.className = 'settings-btn';
  btn.style.right = 'auto';
  btn.style.left = '16px';
  btn.textContent = 'Конец хода';
  btn.addEventListener('click', ()=>{
    const ev = new CustomEvent('endTurn');
    window.dispatchEvent(ev);
    // Временная визуальная реакция
    btn.animate([{transform:'scale(1)'},{transform:'scale(.98)'},{transform:'scale(1)'}],{duration:180});
  });
  document.body.appendChild(btn);
}

// Генератор поля (placeholder) — создаёт SVG-пример сетки и помещает в #game-root.
// Этот генератор параметрический и не изменяет игровую логику — он даёт тестовый визуальный каркас.
function generateGrid(width, height){
  width = Math.max(9, Math.floor(width));
  height = Math.max(9, Math.floor(height));

  let root = document.getElementById('game-root');
  if(!root){
    // Если нет, создадим контейнер в body
    root = document.createElement('div');
    root.id = 'game-root';
    root.style.padding = '12px';
    document.body.appendChild(root);
  }
  // Очищаем старое
  root.innerHTML = '';

  const info = document.createElement('div');
  info.style.marginBottom = '8px';
  info.style.color = '#9fb7d6';
  info.textContent = `Сетка: ${width} × ${height} (placeholder)`;
  root.appendChild(info);

  // Простая таблица как placeholder (реальный перенос SVG/логики позже)
  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.width = '100%';
  const cellSize = Math.max(20, Math.floor(480 / Math.max(width, height)));

  for(let r=0;r<height;r++){
    const tr = document.createElement('tr');
    for(let c=0;c<width;c++){
      const td = document.createElement('td');
      td.style.width = cellSize + 'px';
      td.style.height = cellSize + 'px';
      td.style.border = '1px solid rgba(255,255,255,.04)';
      td.style.background = ( (r+c)%2 === 0 ) ? 'rgba(94,234,212,.03)' : 'transparent';
      td.dataset.r = r;
      td.dataset.c = c;
      td.addEventListener('click', ()=>{
        // placeholder click handler: отмечаем выделение
        td.style.outline = '2px solid rgba(94,234,212,.35)';
        setTimeout(()=>td.style.outline = '', 400);
      });
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  root.appendChild(table);

  // Сигнал о том, что поле создано
  window.dispatchEvent(new CustomEvent('gridGenerated', {detail:{width,height}}));
}

function applySettings(){
  // Применяем настройки к видимым элементам
  document.documentElement.style.fontSize = settings.fontSize + 'px';
  // Перегенерируем поле
  generateGrid(settings.gridWidth, settings.gridHeight);
  // Обновим баланс UI
  updateBalanceUI();
}

// Инициализация
window.addEventListener('DOMContentLoaded', ()=>{
  init();
});

// API: экспортируем в глобальную область для дальнейшей интеграции
window.GAME = window.GAME || {};
window.GAME.settings = settings;
window.GAME.saveSettings = saveSettings;
window.GAME.generateGrid = generateGrid;
window.GAME.buyFuel = buyFuel;
