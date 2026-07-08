const LIFF_ID = '2010632376-xzxeSvRC';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyL-pi9mzdAOPgeMbRWUGrMOeg4iR7nfD31SVbb1BWHiO-i_ftiuSauGTyx6EiV7nH3WA/exec';

let calendarStatus = {};
let daySlots = {};
let lineUserId = '';

let state = {
  type: '',
  price: '',
  basePrice: 0,
  duration: 0,
  options: [],
  optionMinutes: 0,
  optionPrice: 0,
  date: '',
  time: '',
  y: 2026,
  m: 6
};

const $ = id => document.getElementById(id);
const screens = ['s1', 's2', 's3', 'loading', 's4', 'talk'];

function show(id) {
  screens.forEach(s => $(s).classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function key(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function fmt(k) {
  if (!k) return '未選択';
  const d = new Date(k + 'T00:00:00');
  const weeks = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日（${weeks[d.getDay()]}）`;
}

function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `約${h}時間${m}分`;
  if (h) return `約${h}時間`;
  return `約${m}分`;
}

function stat(k) {
  const status = calendarStatus[k];

  if (status === 'ng') {
    return {
      c: 'day-ng',
      l: '<i class="bi bi-x-lg"></i>'
    };
  }

  if (status === 'few') {
    return {
      c: 'day-few',
      l: '<i class="bi bi-triangle"></i>'
    };
  }

  if (status === 'ok') {
    return {
      c: 'day-ok',
      l: '<i class="bi bi-circle"></i>'
    };
  }

  return {
    c: 'day-ng',
    l: '<i class="bi bi-x-lg"></i>'
  };
}

async function loadCalendarStatus() {
  try {
    const start = `${state.y}-${String(state.m + 1).padStart(2, '0')}-01`;
    const type = encodeURIComponent(state.type);

    const totalMinutes = state.duration + state.optionMinutes;

    const url =
      `${GAS_URL}?action=calendar-status`
      + `&start=${start}`
      + `&days=31`
      + `&type=${type}`
      + `&duration=${totalMinutes}`;

    $('monthLabel').textContent = '読み込み中...';
    $('days').innerHTML = '';

    const response = await fetch(url);
    calendarStatus = await response.json();

    renderCal();
  } catch (error) {
    console.error(error);
    alert('カレンダーの取得に失敗しました。');
  }
}

async function loadDaySlots(date) {
  try {
    const type = encodeURIComponent(state.type);

    const totalMinutes = state.duration + state.optionMinutes;

    const url =
      `${GAS_URL}?action=day-slots`
      + `&date=${date}`
      + `&type=${type}`
      + `&duration=${totalMinutes}`;

    $('timeTitle').textContent = `${fmt(date)} の空き時間を取得中...`;
    $('times').innerHTML = '';

    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      alert(result.message || '空き時間の取得に失敗しました。');
      return;
    }

    daySlots[date] = result.times || [];
    renderTimes();

  } catch (error) {
    console.error(error);
    alert('空き時間の取得に失敗しました。');
  }
}

function renderCal() {
  const days = $('days');
  days.innerHTML = '';
  $('monthLabel').textContent = `${state.y}年${state.m + 1}月`;

  const first = new Date(state.y, state.m, 1);
  const start = first.getDay();
  const last = new Date(state.y, state.m + 1, 0).getDate();

  for (let i = 0; i < start; i++) {
    const e = document.createElement('div');
    e.className = 'day day-empty';
    days.appendChild(e);
  }

  for (let d = 1; d <= last; d++) {
    const k = key(state.y, state.m, d);
    const s = stat(k);

    const b = document.createElement('button');
    b.type = 'button';
    b.className = `day ${s.c}${state.date === k ? ' day-selected' : ''}`;
    b.innerHTML = `<span class="day-num">${d}</span><span class="day-status">${s.l}</span>`;

    if (s.c === 'day-ng') {
      b.disabled = true;
    } else {
      b.onclick = async () => {
        state.date = k;
        state.time = '';

        $('detail').classList.add('open');

        renderCal();

        setTimeout(() => {
          $('detail').scrollIntoView({
            behavior: 'smooth'
          });
        }, 120);

        if (!daySlots[k]) {

          await loadDaySlots(k);

        } else {

          renderTimes();

        }
      };
    }

    days.appendChild(b);
  }

  const totalCells = start + last;
  const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 0; i < trailing; i++) {
    const e = document.createElement('div');
    e.className = 'day day-empty';
    days.appendChild(e);
  }
}

function renderTimes() {
  const box = $('times');
  box.innerHTML = '';

  $('timeTitle').textContent = `${fmt(state.date)} の空き時間`;

  (daySlots[state.date] || []).forEach(t => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `slot${state.time === t ? ' slot-selected' : ''}`;
    b.textContent = t;

    b.onclick = () => {
      state.time = t;
      renderTimes();
      document.querySelector('.form').scrollIntoView({
        behavior: 'smooth'
      });
    };

    box.appendChild(b);
  });
}

document.querySelectorAll('.choice').forEach(b => {
  b.onclick = () => {

    document.querySelectorAll('.choice').forEach(x =>
      x.classList.remove('selected')
    );

    b.classList.add('selected');

    state.type = b.dataset.type;
    state.price = b.dataset.price;
    state.duration = Number(b.dataset.duration);
    state.basePrice = Number(b.dataset.basePrice);

    setTimeout(() => {
      document.getElementById('optionBox').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 150);
  };
});

$('toDate').onclick = async () => {

  if (!state.type) {
    return alert('コースを選択してください。');
  }

  const checked = [
    ...document.querySelectorAll('input[name="option"]:checked')
  ];

  state.options = checked.map(x => x.value);

  state.optionMinutes = checked.reduce(
    (sum, x) => sum + Number(x.dataset.minutes),
    0
  );

  state.optionPrice = checked.reduce(
    (sum, x) => sum + Number(x.dataset.price),
    0
  );

  state.date = '';
  state.time = '';

  $('typeLabel').textContent = state.type;
  if (state.options.length) {
    $('optionLabel').textContent =
      `オプション：${state.options.join('・')}`;
    $('optionLabel').style.display = 'block';
  } else {
    $('optionLabel').textContent = '';
    $('optionLabel').style.display = 'none';
  }
  $('detail').classList.remove('open');

  show('s2');

  await loadCalendarStatus();

};

$('prev').onclick = async () => {
  state.m--;

  if (state.m < 0) {
    state.m = 11;
    state.y--;
  }

  state.date = '';
  state.time = '';
  daySlots = {};

  $('detail').classList.remove('open');

  await loadCalendarStatus();

};

$('next').onclick = async () => {
  state.m++;

  if (state.m > 11) {
    state.m = 0;
    state.y++;
  }

  state.date = '';
  state.time = '';
  daySlots = {};

  $('detail').classList.remove('open');

  await loadCalendarStatus();
};

$('toConfirm').onclick = () => {

  if (!state.date || !state.time) {
    return alert('ご希望日時を選択してください。');
  }

  if (!$('name').value.trim()) {
    return alert('お名前を入力してください。');
  }

  const tel = $('tel').value.trim();

  if (!tel) {
    return alert('お電話番号を入力してください。');
  }

  if (!/^[0-9\-]+$/.test(tel)) {
    return alert('電話番号を正しく入力してください。');
  }

  fillConfirm();
  show('s3');
};

function fillConfirm() {
  const tel = $('tel').value.trim() || '未入力';
  const memo = $('memo').value.trim() || 'なし';

  $('cfDate').textContent = `${fmt(state.date)} ${state.time}～`;
  $('cfDuration').textContent = fmtDuration(state.duration + state.optionMinutes);
  $('cfName').textContent = $('name').value.trim();
  $('cfTel').textContent = tel;
  $('cfMemo').textContent = memo;

  const totalPrice = state.basePrice + state.optionPrice;
  const optionLines = state.options.map(option => {
    return `<div class="price-row"><span>${option}</span><span>¥1,100</span></div>`;
  }).join('');

  $('cfSummary').innerHTML =
    `<div class="price-list">
    <div class="price-row"><span>${state.type}</span><span>${state.price}</span></div>
    ${optionLines}
    <div class="price-total"><span>合計</span><span>¥${totalPrice.toLocaleString()}〜</span></div>
  </div>`;
}

$('edit').onclick = async () => {
  show('s2');

  if (state.date) {
    $('detail').classList.add('open');
    renderCal();

    if (!daySlots[state.date]) {
      await loadDaySlots(state.date);
    } else {
      renderTimes();
    }
  }
};

$('changeCourse').onclick = () => {
  state.type = '';
  state.price = '';
  state.basePrice = 0;
  state.duration = 0;
  state.options = [];
  state.optionMinutes = 0;
  state.optionPrice = 0;
  state.date = '';
  state.time = '';

  daySlots = {};
  calendarStatus = {};

  $('detail').classList.remove('open');

  document.querySelectorAll('input[name="option"]').forEach(c => {
    c.checked = false;
  });

  document.querySelectorAll('.choice').forEach(c => {
    c.classList.remove('selected');
  });

  $('optionLabel').textContent = '';
  $('optionLabel').style.display = 'none';
  $('typeLabel').textContent = '';

  show('s1');
};

$('reserve').onclick = async () => {
  show('loading');

  const steps = [
    '予約内容を確認しています…',
    'Googleカレンダーへ登録中…',
    'LINEへ確認メッセージを送信しています…'
  ];

  $('loadingText').textContent = steps[0];

  await new Promise(r => setTimeout(r, 1000));

  $('loadingText').textContent = steps[1];

  const reservation = {
    type: state.type,
    price: `¥${(state.basePrice + state.optionPrice).toLocaleString()}〜`,
    basePrice: state.basePrice,
    optionPrice: state.optionPrice,
    duration: state.duration,
    options: state.options,
    optionMinutes: state.optionMinutes,
    totalMinutes: state.duration + state.optionMinutes,
    date: state.date,
    time: state.time,
    name: $('name').value.trim(),
    tel: $('tel').value.trim(),
    memo: $('memo').value.trim(),
    userId: lineUserId
  };

  try {
    const response = await fetch(`${GAS_URL}?action=reserve`, {
      method: 'POST',
      body: JSON.stringify(reservation)
    });

    const result = await response.json();


    if (!result.success) {
      alert(result.message);
      show('s2');
      await loadCalendarStatus();
      return;
    }

    $('loadingText').textContent = steps[2];

    await new Promise(r => setTimeout(r, 1000));

    fillDone();
    show('s4');
    calendarStatus = {};

    daySlots = {};

  } catch (e) {
    console.error(e);
    alert('予約登録に失敗しました。');
    show('s2');
  }
};

function fillDone() {
  const dt = `${fmt(state.date)} ${state.time}～`;
  const durationText = fmtDuration(state.duration + state.optionMinutes);
  const totalPrice = state.basePrice + state.optionPrice;

  $('doneType').textContent = state.type;
  $('doneDate').textContent = dt;

  $('talkMsg').innerHTML =
    `【ご予約日時】<br>${dt}<br>`
    + `【ご予約内容】<br>${state.type}<br>`
    + `オプション：${state.options.length ? state.options.join('・') : 'なし'}<br>`
    + `料金：¥${totalPrice.toLocaleString()}〜`;
}

$('toLine').onclick = () => {
  if (typeof liff !== 'undefined' && liff.isInClient()) {
    liff.closeWindow();
  } else {
    show('talk');
  }
};

$('restart').onclick = () => {
  state = {
    type: '',
    price: '',
    basePrice: 0,
    duration: 0,
    options: [],
    optionMinutes: 0,
    optionPrice: 0,
    date: '',
    time: '',
    y: 2026,
    m: 6
  };

  calendarStatus = {};
  daySlots = {};

  $('detail').classList.remove('open');

  document.querySelectorAll('input, textarea').forEach(e => {
    e.value = '';
  });

  document.querySelectorAll('input[name="option"]').forEach(c => {
    c.checked = false;
  });

  document.querySelectorAll('.choice').forEach(c => {
    c.classList.remove('selected');
  });

  $('optionLabel').textContent = '';
  $('optionLabel').style.display = 'none';
  $('typeLabel').textContent = '';

  show('s1');
};

$('backBtn').onclick = () => {
  if ($('s2').classList.contains('active')) {
    show('s1');
  } else if ($('s3').classList.contains('active')) {
    show('s2');
  } else if ($('s4').classList.contains('active')) {
    show('s3');
  } else {
    show('s1');
  }
};

async function initLiff() {
  if (typeof liff === 'undefined') {
    console.log('LIFF SDKが読み込まれていません。通常のWebページとして表示します。');
    return;
  }

  try {
    await liff.init({
      liffId: LIFF_ID
    });

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    lineUserId = profile.userId;

  } catch (error) {
    console.error('LIFF初期化エラー:', error);
  }
}
initLiff();
