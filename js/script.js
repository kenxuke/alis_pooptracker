// State variables
let currentDate = new Date();
let logs = JSON.parse(localStorage.getItem('poop_logs') || '{}');
let chartInstance = null;

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

function handleDateTap(dateStr) {
  const currentCount = logs[dateStr] || 0;
  
  if (currentCount >= MAX_DAILY_POOPS) {
    delete logs[dateStr];
  } else {
    logs[dateStr] = currentCount + 1;
  }
  
  localStorage.setItem('poop_logs', JSON.stringify(logs));
  renderCalendar();
  updateAnalytics();
}

function handleDateReset(dateStr) {
  if (logs[dateStr]) {
    delete logs[dateStr];
    localStorage.setItem('poop_logs', JSON.stringify(logs));
    
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    renderCalendar();
    updateAnalytics();
  }
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get current date string for today matching
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
    const count = logs[dateStr] || 0;
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';

    // Highlight current day green
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

    // Long press logic
    let pressTimer = null;
    let isLongPress = false;

    const startPress = () => {
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        handleDateReset(dateStr);
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
      if (isLongPress) {
        e.preventDefault();
      }
    });
    dayCell.addEventListener('touchmove', cancelPress, { passive: true });

    dayCell.addEventListener('mousedown', startPress);
    dayCell.addEventListener('mouseup', cancelPress);
    dayCell.addEventListener('mouseleave', cancelPress);

    dayCell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      handleDateReset(dateStr);
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

  if (!logs[checkStr] || logs[checkStr] <= 0) {
    checkTime -= 86400000;
    checkStr = getLocalDateStr(new Date(checkTime));
  }

  while (logs[checkStr] && logs[checkStr] > 0) {
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
    const count = logs[dateStr] || 0;
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
