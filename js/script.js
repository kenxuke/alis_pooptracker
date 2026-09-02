
let currentDate = new Date();
let logs = JSON.parse(localStorage.getItem('poop_logs') || '{}');
let chartInstance = null;

// DOM Elements
const monthYearLabel = document.getElementById('month-year-label');
const calendarDaysContainer = document.getElementById('calendar-days');
const prevBtn = document.getElementById('prev-month');
const nextBtn = document.getElementById('next-month');

// Sidebar
const sidebar = document.getElementById('analytics-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');

function getFormattedDateStr(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function toggleLog(dateStr) {
  if (logs[dateStr]) {
    delete logs[dateStr];
  } else {
    logs[dateStr] = true;
  }
  localStorage.setItem('poop_logs', JSON.stringify(logs));
  renderCalendar();
  updateAnalytics();
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';

    if (logs[dateStr]) {
      dayCell.classList.add('has-poop');
    }

    dayCell.innerHTML = `
      <span class="day-number">${day}</span>
      ${logs[dateStr] ? '<span class="poop-icon">💩</span>' : ''}
    `;

    dayCell.addEventListener('click', () => toggleLog(dateStr));
    calendarDaysContainer.appendChild(dayCell);
  }
}

function calculateStreak() {
  let streak = 0;
  let today = new Date();
  
  let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let dateStr = getFormattedDateStr(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

  if (!logs[dateStr]) {
    checkDate.setDate(checkDate.getDate() - 1);
    dateStr = getFormattedDateStr(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
  }

  while (logs[dateStr]) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    dateStr = getFormattedDateStr(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
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
    if (logs[dateStr]) {
      monthTotal++;
      const weekIndex = Math.floor((day - 1) / 7);
      if (weekIndex < 5) weeklyCounts[weekIndex]++;
    }
  }

  document.getElementById('stat-total').textContent = monthTotal;
  document.getElementById('stat-streak').textContent = calculateStreak();

  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  // Create smooth gradient for chart bars
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

renderCalendar();
updateAnalytics();