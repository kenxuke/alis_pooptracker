// State variables
let currentDate = new Date();
let rawLogs = JSON.parse(localStorage.getItem('poop_logs') || '{}');

// Data migration: ensure logs format stores arrays of time strings
let logs = {};
for (const key in rawLogs) {
  if (Array.isArray(rawLogs[key])) {
    logs[key] = rawLogs[key];
  } else if (typeof rawLogs[key] === 'number' && rawLogs[key] > 0) {
    // Migrate legacy numeric count into array of mock times
    logs[key] = Array(rawLogs[key]).fill("Logged");
  }
}

let chartInstance = null;
let activeModalDateStr = null;

// DOM Elements
const monthYearLabel = document.getElementById('month-year-label');
const calendarDaysContainer = document.getElementById('calendar-days');
const prevBtn = document.getElementById('prev-month');
const nextBtn = document.getElementById('next-month');

// Sidebar Elements
const sidebar = document.getElementById('analytics-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const deleteAllBtn = document.getElementById('delete-all-btn');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const timeList = document.getElementById('time-list');
const closeModalBtn = document.getElementById('close-modal-btn');
const clearDayBtn = document.getElementById('clear-day-btn');

const MAX_DAILY_POOPS = 5;

function getFormattedDateStr(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getLocalDateStr(dateObj) {
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();
  return getFormattedDateStr(year, month, day);
}

// Format current time into "hh:mm AM/PM"
function getCurrentTimeString() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function handleDateTap(dateStr) {
  const times = logs[dateStr] || [];
  
  if (times.length >= MAX_DAILY_POOPS) {
    delete logs[dateStr];
  } else {
    times.push(getCurrentTimeString());
    logs[dateStr] = times;
  }
  
  localStorage.setItem('poop_logs', JSON.stringify(logs));
  renderCalendar();
  updateAnalytics();
}

function openTimeModal(dateStr) {
  const times = logs[dateStr] || [];
  if (times.length === 0) return;

  activeModalDateStr = dateStr;
  modalTitle.textContent = `Logged Times (${dateStr})`;
  timeList.innerHTML = '';

  times.forEach((time, index) => {
    const li = document.createElement('li');
    li.className = 'time-item';
    li.innerHTML = `
      <span>💩 Poop ${index + 1}: ${time}</span>
      <button class="delete-single-time" aria-label="Remove entry">&times;</button>
    `;
    li.querySelector('.delete-single-time').addEventListener('click', () => {
      removeTimeEntry(dateStr, index);
    });
    timeList.appendChild(li);
  });

  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
  activeModalDateStr = null;
}

function removeTimeEntry(dateStr, index) {
  if (logs[dateStr]) {
    logs[dateStr].splice(index, 1);
    if (logs[dateStr].length === 0) {
      delete logs[dateStr];
      closeModal();
    } else {
      openTimeModal(dateStr); // Refresh list
    }
    localStorage.setItem('poop_logs', JSON.stringify(logs));
    renderCalendar();
    updateAnalytics();
  }
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = getLocalDateStr(new Date());

  monthYearLabel.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);

  const dayCells = calendarDaysContainer.querySelectorAll('.day-cell');
  dayCells.forEach(cell => cell.remove());

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day-cell empty';
    calendarDaysContainer.appendChild(emptyCell);
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = getFormattedDateStr(year, month, day);
    const times = logs[dateStr] || [];
    const count = times.length;
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';

    if (dateStr === todayStr) {
      dayCell.classList.add('today');
    }

    if (count > 0) {
      dayCell.classList.add('has-poop');
    }

    let indicatorHtml = '';
    if (count === 1) {
      indicatorHtml = `<div class="poop-wrapper"><span class="poop-icon">💩</span></div>`;
    } else if (count > 1) {
      indicatorHtml = `
        <div class="poop-wrapper">
          <span class="poop-icon">💩</span>
          <span class="count-badge">x${count}</span>
        </div>`;
    }

    dayCell.innerHTML = `
      <span class="day-number">${day}</span>
      ${indicatorHtml}
    `;

    // Long press logic -> Open Modal with logged times
    let pressTimer = null;
    let isLongPress = false;

    const startPress = () => {
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        if (logs[dateStr] && logs[dateStr].length > 0) {
          if (navigator.vibrate) navigator.vibrate(50);
          openTimeModal(dateStr);
        }
      }, 500);
    };

    const cancelPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    dayCell.addEventListener('touchstart', startPress, { passive: true });
    dayCell.addEventListener('touchend', (e) => {
      cancelPress();
      if (isLongPress) e.preventDefault();
    });
    dayCell.addEventListener('touchmove', cancelPress, { passive: true });

    dayCell.addEventListener('mousedown', startPress);
    dayCell.addEventListener('mouseup', cancelPress);
    dayCell.addEventListener('mouseleave', cancelPress);

    dayCell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openTimeModal(dateStr);
    });

    dayCell.addEventListener('click', () => {
      if (!isLongPress) {
        handleDateTap(dateStr);
      }
    });

    calendarDaysContainer.appendChild(dayCell);
  }
}

function calculateStreak() {
  let streak = 0;
  let now = new Date();
  
  let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let checkTime = today.getTime();
  let checkStr = getLocalDateStr(new Date(checkTime));

  if (!logs[checkStr] || logs[checkStr].length <= 0) {
    checkTime -= 86400000;
    checkStr = getLocalDateStr(new Date(checkTime));
  }

  while (logs[checkStr] && logs[checkStr].length > 0) {
    streak++;
    checkTime -= 86400000;
    checkStr = getLocalDateStr(new Date(checkTime));
  }

  return streak;
}

function updateAnalytics() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  let monthTotal = 0;
  const weeklyCounts = [0, 0, 0, 0, 0];

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = getFormattedDateStr(year, month, day);
    const times = logs[dateStr] || [];
    const count = times.length;
    if (count > 0) {
      monthTotal += count;
      const weekIndex = Math.floor((day - 1) / 7);
      if (weekIndex < 5) weeklyCounts[weekIndex] += count;
    }
  }

  document.getElementById('stat-total').textContent = monthTotal;
  document.getElementById('stat-streak').textContent = calculateStreak();

  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, '#96613D');
  gradient.addColorStop(1, '#DDB892');

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['W1', 'W2', 'W3', 'W4', 'W5'],
      datasets: [{
        label: 'Logs',
        data: weeklyCounts,
        backgroundColor: gradient,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: '#2D241E',
          padding: 10,
          cornerRadius: 8,
          titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
          bodyFont: { family: 'Plus Jakarta Sans', size: 12 }
        }
      },
      scales: {
        y: { 
          beginAtZero: true, 
          ticks: { stepSize: 1, precision: 0, font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#8C7B70' },
          grid: { color: 'rgba(140, 123, 112, 0.08)' }
        },
        x: { 
          grid: { display: false },
          ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }, color: '#8C7B70' }
        }
      }
    }
  });
}

function deleteAllData() {
  const confirmed = confirm("Are you sure you want to delete all saved log entries? This action cannot be undone.");
  if (confirmed) {
    logs = {};
    localStorage.removeItem('poop_logs');
    renderCalendar();
    updateAnalytics();
    closeSidebar();
  }
}

/* Modal Event Listeners */
closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
clearDayBtn.addEventListener('click', () => {
  if (activeModalDateStr && logs[activeModalDateStr]) {
    delete logs[activeModalDateStr];
    localStorage.setItem('poop_logs', JSON.stringify(logs));
    renderCalendar();
    updateAnalytics();
    closeModal();
  }
});

/* Sidebar Toggle Logic */
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
  setTimeout(() => {
    if (chartInstance) chartInstance.resize();
  }, 350);
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
}

toggleSidebarBtn.addEventListener('click', openSidebar);
closeSidebarBtn.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);
deleteAllBtn.addEventListener('click', deleteAllData);

// Month Navigation
prevBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
  updateAnalytics();
});

nextBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
  updateAnalytics();
});

// Initial Load
renderCalendar();
updateAnalytics();