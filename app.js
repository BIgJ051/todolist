/**
 * TaskFlow - Modern To-Do Web Application
 * State Management, Audio Synthesis, Drag & Drop, LocalStorage Persistence
 */

(() => {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEY = 'taskflow_tasks_data';
  const THEME_KEY = 'taskflow_theme';
  const SOUND_KEY = 'taskflow_sound';

  const CATEGORY_NAMES = {
    all: '전체 보기',
    work: '업무 / 비즈니스',
    personal: '개인 라이프',
    study: '공부 / 자기계발',
    health: '운동 / 건강',
    finance: '재정 / 쇼핑'
  };

  const PRIORITY_LABELS = {
    high: { text: '높음 🔥', class: 'high' },
    medium: { text: '중간 ⚡', class: 'medium' },
    low: { text: '낮음 🌱', class: 'low' }
  };

  // Initial Demo Tasks for first-time visitors
  const DEFAULT_TASKS = [
    {
      id: 'demo-1',
      title: '오늘하루 둘러보기 및 첫 번째 할 일 완료하기 🎉',
      notes: '체크박스를 클릭하여 할 일을 완료하고 달성률을 올려보세요!',
      category: 'personal',
      priority: 'high',
      dueDate: new Date().toISOString().split('T')[0],
      completed: false,
      starred: true,
      createdAt: Date.now() - 3600000,
      order: 0
    },
    {
      id: 'demo-2',
      title: '새로운 프로젝트 기획안 검토 및 피드백 작성',
      notes: '주요 마일스톤과 리소스 배분 계획 확인하기',
      category: 'work',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      completed: false,
      starred: false,
      createdAt: Date.now() - 7200000,
      order: 1
    },
    {
      id: 'demo-3',
      title: '매일 30분 유산소 운동 & 물 2L 마시기',
      notes: '건강한 하루 루틴 유지하기',
      category: 'health',
      priority: 'medium',
      dueDate: '',
      completed: true,
      starred: false,
      createdAt: Date.now() - 10800000,
      order: 2
    },
    {
      id: 'demo-4',
      title: '웹 프론트엔드 최신 디자인 트렌드 아티클 읽기',
      notes: 'Glassmorphism 및 반응형 UI 레이아웃 리서치',
      category: 'study',
      priority: 'low',
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      completed: false,
      starred: false,
      createdAt: Date.now() - 14400000,
      order: 3
    }
  ];

  // Random Inspiring Quotes
  const QUOTES = [
    '"작은 진전이 모여 위대한 성취를 만듭니다."',
    '"가장 확실한 성공 비결은 언제나 한 번 더 시도해보는 것입니다."',
    '"오늘 할 수 있는 일을 내일로 미루지 마세요."',
    '"집중력은 생산성의 가장 강력한 무기입니다."',
    '"한 걸음 한 걸음이 목표를 향한 확실한 전진입니다."'
  ];

  // --- State ---
  let state = {
    tasks: [],
    theme: localStorage.getItem(THEME_KEY) || 'dark',
    soundEnabled: localStorage.getItem(SOUND_KEY) !== 'false',
    activeCategory: 'all',
    activeStatus: 'all',
    searchQuery: '',
    sortBy: 'created-desc',
    draggedTaskId: null
  };

  // --- Web Audio Synthesizer (Zero external dependencies) ---
  const AudioEngine = {
    ctx: null,

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
    },

    playTone(frequency, type, duration, gainStart = 0.15) {
      if (!state.soundEnabled) return;
      try {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        gain.gain.setValueAtTime(gainStart, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        // Audio playback failed gracefully
      }
    },

    playAddSound() {
      this.playTone(520, 'sine', 0.1, 0.1);
      setTimeout(() => this.playTone(780, 'sine', 0.12, 0.08), 80);
    },

    playCompleteSound() {
      this.playTone(523.25, 'triangle', 0.12, 0.12); // C5
      setTimeout(() => this.playTone(659.25, 'triangle', 0.12, 0.12), 80); // E5
      setTimeout(() => this.playTone(783.99, 'triangle', 0.25, 0.15), 160); // G5
    },

    playUncheckSound() {
      this.playTone(400, 'sine', 0.08, 0.08);
    },

    playDeleteSound() {
      this.playTone(280, 'sawtooth', 0.12, 0.08);
      setTimeout(() => this.playTone(200, 'sawtooth', 0.15, 0.06), 70);
    }
  };

  // --- DOM Elements ---
  const elements = {
    appHtml: document.documentElement,
    taskList: document.getElementById('taskList'),
    emptyState: document.getElementById('emptyState'),
    emptyStateTitle: document.getElementById('emptyStateTitle'),
    emptyStateDesc: document.getElementById('emptyStateDesc'),
    taskForm: document.getElementById('taskForm'),
    taskTitleInput: document.getElementById('taskTitleInput'),
    taskCategorySelect: document.getElementById('taskCategorySelect'),
    taskPrioritySelect: document.getElementById('taskPrioritySelect'),
    taskDueDateInput: document.getElementById('taskDueDateInput'),
    taskNotesInput: document.getElementById('taskNotesInput'),
    toggleNotesBtn: document.getElementById('toggleNotesBtn'),
    notesInputWrapper: document.getElementById('notesInputWrapper'),
    notesToggleText: document.getElementById('notesToggleText'),
    
    // Stats & Progress
    progressBar: document.getElementById('progressBar'),
    progressPercentage: document.getElementById('progressPercentage'),
    totalTaskCount: document.getElementById('totalTaskCount'),
    pendingTaskCount: document.getElementById('pendingTaskCount'),
    completedTaskCount: document.getElementById('completedTaskCount'),
    filteredCountBadge: document.getElementById('filteredCountBadge'),
    currentViewTitle: document.getElementById('currentViewTitle'),
    dailyQuote: document.getElementById('dailyQuote'),

    // Category Counts
    catCountAll: document.getElementById('catCountAll'),
    catCountWork: document.getElementById('catCountWork'),
    catCountPersonal: document.getElementById('catCountPersonal'),
    catCountStudy: document.getElementById('catCountStudy'),
    catCountHealth: document.getElementById('catCountHealth'),
    catCountFinance: document.getElementById('catCountFinance'),
    categoryNav: document.getElementById('categoryNav'),

    // Search & Filter
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    statusTabs: document.getElementById('statusTabs'),
    sortSelect: document.getElementById('sortSelect'),

    // Global Actions
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    soundIcon: document.getElementById('soundIcon'),
    moreActionsBtn: document.getElementById('moreActionsBtn'),
    moreMenu: document.getElementById('moreMenu'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    importDataInput: document.getElementById('importDataInput'),
    clearAllCompletedBtn: document.getElementById('clearAllCompletedBtn'),
    resetAllBtn: document.getElementById('resetAllBtn'),
    markAllCompletedBtn: document.getElementById('markAllCompletedBtn'),

    // Edit Modal
    editModal: document.getElementById('editModal'),
    editForm: document.getElementById('editForm'),
    editTaskId: document.getElementById('editTaskId'),
    editTitleInput: document.getElementById('editTitleInput'),
    editCategorySelect: document.getElementById('editCategorySelect'),
    editPrioritySelect: document.getElementById('editPrioritySelect'),
    editDueDateInput: document.getElementById('editDueDateInput'),
    editNotesTextarea: document.getElementById('editNotesTextarea'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // --- Local cache & Supabase synchronization ---
  // The app keeps a local cache so it remains usable while offline. When
  // Supabase is configured, every change is also written to the signed-in
  // anonymous user's private task rows.
  let supabaseClient = null;
  let supabaseUser = null;
  let supabaseSyncQueue = Promise.resolve();
  let supabaseLastError = null;
  const remoteVersions = new Map();

  function getSupabaseConfig() {
    const config = window.SUPABASE_CONFIG;
    if (!config || !config.url || !config.anonKey) return null;
    if (config.url.includes('YOUR_PROJECT') || config.anonKey.includes('YOUR_')) return null;
    return config;
  }

  async function connectSupabase() {
    const config = getSupabaseConfig();
    if (!config) {
      supabaseLastError = new Error('Supabase configuration is missing.');
      return false;
    }
    if (!window.supabase) {
      supabaseLastError = new Error('Supabase client library could not be loaded.');
      return false;
    }

    try {
      supabaseClient = window.supabase.createClient(config.url, config.anonKey);
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError) throw sessionError;

      let session = sessionData.session;
      if (!session) {
        const { data, error } = await supabaseClient.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }

      if (!session || !session.user) throw new Error('Supabase anonymous sign-in did not return a user.');
      supabaseUser = session.user;
      supabaseLastError = null;
      return true;
    } catch (error) {
      console.error('Supabase connection failed. Continuing with local storage.', error);
      supabaseLastError = error;
      supabaseClient = null;
      supabaseUser = null;
      return false;
    }
  }

  function taskToRow(task) {
    return {
      id: task.id,
      title: task.title,
      category: task.category,
      priority: task.priority,
      due_date: task.dueDate || null,
      notes: task.notes || '',
      is_completed: Boolean(task.completed),
      is_starred: Boolean(task.starred),
      sort_order: Number.isFinite(task.order) ? task.order : 0,
      created_at: Number.isFinite(task.createdAt) ? task.createdAt : Date.now()
    };
  }

  function rowToTask(row) {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      priority: row.priority,
      dueDate: row.due_date || '',
      notes: row.notes || '',
      completed: Boolean(row.is_completed),
      starred: Boolean(row.is_starred),
      createdAt: row.created_at,
      order: row.sort_order,
      updatedAt: row.updated_at
    };
  }

  function rememberRemoteRow(row) {
    if (!row) return;
    remoteVersions.set(row.id, row.updated_at);
    const task = state.tasks.find(item => item.id === row.id);
    if (task) task.updatedAt = row.updated_at;
  }

  function saveLocalTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    } catch (error) {
      console.error('Error saving tasks locally:', error);
    }
  }

  async function resolveRemoteConflict(id) {
    const { data: remoteRow, error } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;

    const localIndex = state.tasks.findIndex(task => task.id === id);
    if (remoteRow) {
      const remoteTask = rowToTask(remoteRow);
      if (localIndex === -1) state.tasks.push(remoteTask);
      else state.tasks[localIndex] = remoteTask;
      rememberRemoteRow(remoteRow);
    } else if (localIndex !== -1) {
      state.tasks.splice(localIndex, 1);
      remoteVersions.delete(id);
    }

    saveLocalTasks();
    updateUI();
    showToast('다른 기기에서 변경된 할 일을 최신 값으로 다시 불러왔습니다.', 'warning');
  }

  function queueSupabaseOperation(operation) {
    if (!supabaseClient || !supabaseUser) return;
    supabaseSyncQueue = supabaseSyncQueue
      .then(operation)
      .catch(error => {
        supabaseLastError = error;
        console.error('Supabase sync failed. Local changes were kept.', error);
        showToast('Supabase 저장에 실패했습니다. 브라우저 콘솔을 확인해 주세요.', 'danger');
      });
  }

  function persistCreatedTasks(tasks) {
    const snapshots = tasks.map(task => ({ ...task }));
    if (!snapshots.length) return;

    queueSupabaseOperation(async () => {
      const { data, error } = await supabaseClient
        .from('tasks')
        .insert(snapshots.map(taskToRow))
        .select('*');
      if (error) throw error;
      (data || []).forEach(rememberRemoteRow);
      saveLocalTasks();
    });
  }

  function persistUpdatedTasks(tasks) {
    const snapshots = tasks.map(task => ({ ...task }));
    if (!snapshots.length) return;

    queueSupabaseOperation(async () => {
      for (const task of snapshots) {
        const knownVersion = remoteVersions.get(task.id);
        let query = supabaseClient
          .from('tasks')
          .update(taskToRow(task))
          .eq('id', task.id);
        if (knownVersion) query = query.eq('updated_at', knownVersion);

        const { data, error } = await query.select('*').maybeSingle();
        if (error) throw error;
        if (!data) {
          await resolveRemoteConflict(task.id);
          continue;
        }
        rememberRemoteRow(data);
      }
      saveLocalTasks();
    });
  }

  function persistDeletedTasks(tasks) {
    const snapshots = tasks.map(task => ({ ...task }));
    if (!snapshots.length) return;

    queueSupabaseOperation(async () => {
      for (const task of snapshots) {
        const knownVersion = remoteVersions.get(task.id) || task.updatedAt;
        let query = supabaseClient
          .from('tasks')
          .delete()
          .eq('id', task.id);
        if (knownVersion) query = query.eq('updated_at', knownVersion);

        const { data, error } = await query.select('id').maybeSingle();
        if (error) throw error;
        if (!data && knownVersion) {
          await resolveRemoteConflict(task.id);
          continue;
        }
        remoteVersions.delete(task.id);
      }
    });
  }

  function persistReplacedTaskSet(previousTasks, nextTasks) {
    const previousById = new Map(previousTasks.map(task => [task.id, task]));
    const nextIds = new Set(nextTasks.map(task => task.id));
    const removed = previousTasks.filter(task => !nextIds.has(task.id));
    const created = nextTasks.filter(task => !previousById.has(task.id));
    const updated = nextTasks.filter(task => previousById.has(task.id));

    persistDeletedTasks(removed);
    persistCreatedTasks(created);
    persistUpdatedTasks(updated);
  }

  async function uploadInitialTasks(tasks) {
    if (!tasks.length) return;
    const { data, error } = await supabaseClient
      .from('tasks')
      .insert(tasks.map(taskToRow))
      .select('*');
    if (error) throw error;
    (data || []).forEach(rememberRemoteRow);
    saveLocalTasks();
  }

  async function loadTasks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state.tasks = JSON.parse(saved);
      } else {
        state.tasks = [...DEFAULT_TASKS];
        saveLocalTasks();
      }
    } catch (e) {
      console.error('Error loading tasks:', e);
      state.tasks = [...DEFAULT_TASKS];
    }

    const connected = await connectSupabase();
    if (!connected) return;

    try {
      const { data: remoteRows, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;

      if (remoteRows && remoteRows.length) {
        state.tasks = remoteRows.map(rowToTask);
        remoteRows.forEach(rememberRemoteRow);
        saveLocalTasks();
      } else if (state.tasks.length) {
        await uploadInitialTasks(state.tasks);
      }
    } catch (error) {
      supabaseLastError = error;
      console.error('Could not load tasks from Supabase. Continuing with local storage.', error);
    }
  }

  // --- Confetti Celebration ---
  function triggerCelebration(full = false) {
    if (typeof confetti !== 'function') return;

    if (full) {
      // Big grand celebration for 100% completion
      const count = 200;
      const defaults = { origin: { y: 0.7 } };

      function fire(particleRatio, opts) {
        confetti(Object.assign({}, defaults, opts, {
          particleCount: Math.floor(count * particleRatio)
        }));
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    } else {
      // Subtle sparkle
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#06b6d4']
      });
    }
  }

  // --- Toast Notification ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert-triangle';
    if (type === 'danger') iconName = 'alert-octagon';

    toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${escapeHtml(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    if (window.lucide) {
      lucide.createIcons({ root: toast });
    }

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px) scale(0.95)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- Safe HTML escape ---
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- Date Formatter & Due Helper ---
  function formatDueDateBadge(dateString) {
    if (!dateString) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = dateString.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `<span class="due-badge overdue" title="마감 기한 지남"><i data-lucide="alert-circle"></i> ${Math.abs(diffDays)}일 지남</span>`;
    } else if (diffDays === 0) {
      return `<span class="due-badge today" title="오늘 마감"><i data-lucide="clock"></i> 오늘 마감</span>`;
    } else if (diffDays === 1) {
      return `<span class="due-badge" title="내일 마감"><i data-lucide="calendar"></i> 내일 마감</span>`;
    } else {
      return `<span class="due-badge" title="${dateString}"><i data-lucide="calendar"></i> D-${diffDays}</span>`;
    }
  }

  // --- Render & UI Update ---
  function updateUI() {
    renderStats();
    renderTasks();
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function renderStats() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    elements.totalTaskCount.textContent = total;
    elements.completedTaskCount.textContent = completed;
    elements.pendingTaskCount.textContent = pending;
    elements.progressPercentage.textContent = `${percentage}%`;
    elements.progressBar.style.width = `${percentage}%`;

    // Category Counts
    const counts = { all: total, work: 0, personal: 0, study: 0, health: 0, finance: 0 };
    state.tasks.forEach(t => {
      if (counts[t.category] !== undefined) {
        counts[t.category]++;
      }
    });

    elements.catCountAll.textContent = counts.all;
    elements.catCountWork.textContent = counts.work;
    elements.catCountPersonal.textContent = counts.personal;
    elements.catCountStudy.textContent = counts.study;
    elements.catCountHealth.textContent = counts.health;
    elements.catCountFinance.textContent = counts.finance;
  }

  function getFilteredTasks() {
    let result = [...state.tasks];

    // Filter by category
    if (state.activeCategory !== 'all') {
      result = result.filter(t => t.category === state.activeCategory);
    }

    // Filter by status tab
    if (state.activeStatus === 'active') {
      result = result.filter(t => !t.completed);
    } else if (state.activeStatus === 'completed') {
      result = result.filter(t => t.completed);
    } else if (state.activeStatus === 'important') {
      result = result.filter(t => t.starred);
    }

    // Search filter
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(query) || 
        (t.notes && t.notes.toLowerCase().includes(query))
      );
    }

    // Sorting
    result.sort((a, b) => {
      switch (state.sortBy) {
        case 'due-asc': {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case 'priority-desc': {
          const pOrder = { high: 3, medium: 2, low: 1 };
          return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
        }
        case 'title-asc':
          return a.title.localeCompare(b.title, 'ko');
        case 'created-desc':
        default:
          return (a.order ?? 0) - (b.order ?? 0);
      }
    });

    return result;
  }

  function renderTasks() {
    const filtered = getFilteredTasks();
    elements.filteredCountBadge.textContent = `${filtered.length}개`;

    // Update Section Title
    let title = CATEGORY_NAMES[state.activeCategory] || '할 일 목록';
    if (state.activeStatus === 'active') title += ' (진행중)';
    else if (state.activeStatus === 'completed') title += ' (완료됨)';
    else if (state.activeStatus === 'important') title += ' (중요 ⭐)';
    if (state.searchQuery) title = `검색 결과: "${state.searchQuery}"`;
    elements.currentViewTitle.textContent = title;

    if (filtered.length === 0) {
      elements.taskList.innerHTML = '';
      elements.emptyState.classList.remove('hidden');

      if (state.searchQuery) {
        elements.emptyStateTitle.textContent = '검색 결과가 없습니다';
        elements.emptyStateDesc.textContent = '다른 키워드로 검색하거나 필터를 조정해보세요.';
      } else if (state.activeStatus === 'completed') {
        elements.emptyStateTitle.textContent = '완료된 할 일이 없습니다';
        elements.emptyStateDesc.textContent = '할 일을 완료하고 체크박스를 눌러보세요!';
      } else {
        elements.emptyStateTitle.textContent = '등록된 할 일이 없습니다';
        elements.emptyStateDesc.textContent = '새로운 목표나 오늘 해야 할 일을 추가해보세요!';
      }
      return;
    }

    elements.emptyState.classList.add('hidden');

    elements.taskList.innerHTML = filtered.map(task => {
      const priorityInfo = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium;
      const dueBadgeHtml = formatDueDateBadge(task.dueDate);

      return `
        <li class="task-item ${task.completed ? 'completed' : ''}" 
            data-id="${task.id}" 
            data-priority="${task.priority}" 
            draggable="true">
          
          <div class="drag-handle" title="드래그하여 순서 변경">
            <i data-lucide="grip-vertical"></i>
          </div>

          <div class="task-checkbox-wrap">
            <button class="task-checkbox-btn" data-action="toggle" data-id="${task.id}" aria-label="완료 여부 토글">
              <i data-lucide="check"></i>
            </button>
          </div>

          <div class="task-content" data-action="edit" data-id="${task.id}">
            <div class="task-title-row">
              <span class="task-title">${escapeHtml(task.title)}</span>
            </div>

            ${task.notes ? `<div class="task-notes">${escapeHtml(task.notes)}</div>` : ''}

            <div class="task-meta-tags">
              <span class="tag-badge tag-${task.category}">
                <i data-lucide="tag"></i> ${CATEGORY_NAMES[task.category] || task.category}
              </span>
              <span class="priority-badge ${priorityInfo.class}">
                ${priorityInfo.text}
              </span>
              ${dueBadgeHtml}
            </div>
          </div>

          <div class="task-actions">
            <button class="action-btn btn-star ${task.starred ? 'starred' : ''}" 
                    data-action="star" 
                    data-id="${task.id}" 
                    title="${task.starred ? '중요 해제' : '중요 표시'}">
              <i data-lucide="star" class="${task.starred ? 'fill-current' : ''}"></i>
            </button>
            <button class="action-btn btn-edit" 
                    data-action="edit" 
                    data-id="${task.id}" 
                    title="수정">
              <i data-lucide="edit-3"></i>
            </button>
            <button class="action-btn btn-delete" 
                    data-action="delete" 
                    data-id="${task.id}" 
                    title="삭제">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </li>
      `;
    }).join('');

    setupDragAndDrop();
  }

  // --- Task CRUD Operations ---
  function addTask(title, category, priority, dueDate, notes) {
    if (!title.trim()) return;

    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: title.trim(),
      category: category || 'personal',
      priority: priority || 'medium',
      dueDate: dueDate || '',
      notes: notes ? notes.trim() : '',
      completed: false,
      starred: false,
      createdAt: Date.now(),
      order: state.tasks.length
    };

    state.tasks.unshift(newTask);
    // re-index order
    state.tasks.forEach((t, i) => t.order = i);

    saveLocalTasks();
    persistCreatedTasks([newTask]);
    persistUpdatedTasks(state.tasks.filter(task => task.id !== newTask.id));
    updateUI();
    AudioEngine.playAddSound();
    showToast('새로운 할 일이 추가되었습니다.', 'success');
  }

  function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveLocalTasks();
    persistUpdatedTasks([task]);
    updateUI();

    if (task.completed) {
      AudioEngine.playCompleteSound();
      
      // Check if all are completed
      const allCompleted = state.tasks.length > 0 && state.tasks.every(t => t.completed);
      if (allCompleted) {
        triggerCelebration(true);
        showToast('🎉 대단해요! 모든 할 일을 완료했습니다!', 'success');
      } else {
        triggerCelebration(false);
      }
    } else {
      AudioEngine.playUncheckSound();
    }
  }

  function toggleStar(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    task.starred = !task.starred;
    saveLocalTasks();
    persistUpdatedTasks([task]);
    updateUI();
    AudioEngine.playTone(600, 'sine', 0.08, 0.05);
  }

  function deleteTask(id) {
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx === -1) return;

    const [deleted] = state.tasks.splice(idx, 1);
    state.tasks.forEach((t, i) => t.order = i);
    saveLocalTasks();
    persistDeletedTasks([deleted]);
    persistUpdatedTasks(state.tasks);
    updateUI();
    AudioEngine.playDeleteSound();
    showToast(`"${deleted.title}" 삭제되었습니다.`, 'warning');
  }

  function openEditModal(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    elements.editTaskId.value = task.id;
    elements.editTitleInput.value = task.title;
    elements.editCategorySelect.value = task.category;
    elements.editPrioritySelect.value = task.priority;
    elements.editDueDateInput.value = task.dueDate || '';
    elements.editNotesTextarea.value = task.notes || '';

    elements.editModal.classList.remove('hidden');
    elements.editTitleInput.focus();
  }

  function closeEditModal() {
    elements.editModal.classList.add('hidden');
    elements.editForm.reset();
  }

  function saveEditedTask() {
    const id = elements.editTaskId.value;
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    const newTitle = elements.editTitleInput.value.trim();
    if (!newTitle) return;

    task.title = newTitle;
    task.category = elements.editCategorySelect.value;
    task.priority = elements.editPrioritySelect.value;
    task.dueDate = elements.editDueDateInput.value;
    task.notes = elements.editNotesTextarea.value.trim();

    saveLocalTasks();
    persistUpdatedTasks([task]);
    updateUI();
    closeEditModal();
    AudioEngine.playTone(550, 'sine', 0.1, 0.08);
    showToast('할 일이 수정되었습니다.', 'info');
  }

  // --- Drag & Drop Implementation ---
  function setupDragAndDrop() {
    const items = elements.taskList.querySelectorAll('.task-item');

    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        state.draggedTaskId = item.getAttribute('data-id');
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', state.draggedTaskId);
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        items.forEach(el => el.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const targetId = item.getAttribute('data-id');
        const draggedId = state.draggedTaskId;

        if (!draggedId || draggedId === targetId) return;

        const fromIdx = state.tasks.findIndex(t => t.id === draggedId);
        const toIdx = state.tasks.findIndex(t => t.id === targetId);

        if (fromIdx !== -1 && toIdx !== -1) {
          const [movedTask] = state.tasks.splice(fromIdx, 1);
          state.tasks.splice(toIdx, 0, movedTask);
          state.tasks.forEach((t, i) => t.order = i);
          saveLocalTasks();
          persistUpdatedTasks(state.tasks);
          updateUI();
          AudioEngine.playTone(480, 'sine', 0.08, 0.05);
        }
      });
    });
  }

  // --- Backup & Restore ---
  function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `taskflow_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('데이터 백업 파일이 다운로드되었습니다.', 'success');
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported)) {
          const previousTasks = state.tasks.map(task => ({ ...task }));
          state.tasks = imported;
          saveLocalTasks();
          persistReplacedTaskSet(previousTasks, state.tasks);
          updateUI();
          showToast(`성공적으로 ${imported.length}개의 할 일을 가져왔습니다.`, 'success');
        } else {
          showToast('올바른 TaskFlow JSON 파일이 아닙니다.', 'danger');
        }
      } catch (err) {
        showToast('JSON 파일을 읽는 중 오류가 발생했습니다.', 'danger');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  // --- Event Listeners Initialization ---
  function initEvents() {
    // Task Form Submit
    elements.taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = elements.taskTitleInput.value;
      const category = elements.taskCategorySelect.value;
      const priority = elements.taskPrioritySelect.value;
      const dueDate = elements.taskDueDateInput.value;
      const notes = elements.taskNotesInput.value;

      addTask(title, category, priority, dueDate, notes);

      elements.taskTitleInput.value = '';
      elements.taskNotesInput.value = '';
      elements.taskTitleInput.focus();
    });

    // Notes Toggle
    elements.toggleNotesBtn.addEventListener('click', () => {
      const isHidden = elements.notesInputWrapper.classList.toggle('hidden');
      elements.notesToggleText.textContent = isHidden ? '메모 추가' : '메모 접기';
      if (!isHidden) {
        elements.taskNotesInput.focus();
      }
    });

    // Task List Delegated Events (Check, Star, Edit, Delete)
    elements.taskList.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const id = target.getAttribute('data-id');

      if (action === 'toggle') {
        toggleTask(id);
      } else if (action === 'star') {
        toggleStar(id);
      } else if (action === 'edit') {
        openEditModal(id);
      } else if (action === 'delete') {
        deleteTask(id);
      }
    });

    // Category Nav Filter
    elements.categoryNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-nav-item');
      if (!btn) return;

      elements.categoryNav.querySelectorAll('.cat-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.activeCategory = btn.getAttribute('data-category');
      updateUI();
    });

    // Status Tabs Filter
    elements.statusTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.status-tab');
      if (!btn) return;

      elements.statusTabs.querySelectorAll('.status-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.activeStatus = btn.getAttribute('data-status');
      updateUI();
    });

    // Search Input
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      elements.clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
      renderTasks();
      if (window.lucide) lucide.createIcons();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.clearSearchBtn.classList.add('hidden');
      renderTasks();
      if (window.lucide) lucide.createIcons();
    });

    // Sort Selection
    elements.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderTasks();
      if (window.lucide) lucide.createIcons();
    });

    // Theme Toggle
    elements.themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      elements.appHtml.setAttribute('data-theme', state.theme);
      localStorage.setItem(THEME_KEY, state.theme);
      elements.themeIcon.setAttribute('data-lucide', state.theme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) lucide.createIcons();
      showToast(`${state.theme === 'dark' ? '다크' : '라이트'} 모드로 전환되었습니다.`, 'info');
    });

    // Sound Toggle
    elements.soundToggleBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      localStorage.setItem(SOUND_KEY, state.soundEnabled);
      elements.soundIcon.setAttribute('data-lucide', state.soundEnabled ? 'volume-2' : 'volume-x');
      if (window.lucide) lucide.createIcons();
      showToast(`효과음이 ${state.soundEnabled ? '켜졌습니다' : '꺼졌습니다'}.`, 'info');
    });

    // More Menu Toggle
    elements.moreActionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.moreMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!elements.moreActionsBtn.contains(e.target) && !elements.moreMenu.contains(e.target)) {
        elements.moreMenu.classList.remove('active');
      }
    });

    // Export & Import
    elements.exportDataBtn.addEventListener('click', () => {
      elements.moreMenu.classList.remove('active');
      exportData();
    });

    elements.importDataInput.addEventListener('change', (e) => {
      elements.moreMenu.classList.remove('active');
      importData(e);
    });

    // Clear Completed
    elements.clearAllCompletedBtn.addEventListener('click', () => {
      elements.moreMenu.classList.remove('active');
      const completedCount = state.tasks.filter(t => t.completed).length;
      if (completedCount === 0) {
        showToast('삭제할 완료 항목이 없습니다.', 'info');
        return;
      }
      if (confirm(`완료된 할 일 ${completedCount}개를 모두 삭제하시겠습니까?`)) {
        const completedTasks = state.tasks.filter(t => t.completed);
        state.tasks = state.tasks.filter(t => !t.completed);
        state.tasks.forEach((task, index) => task.order = index);
        saveLocalTasks();
        persistDeletedTasks(completedTasks);
        persistUpdatedTasks(state.tasks);
        updateUI();
        AudioEngine.playDeleteSound();
        showToast(`${completedCount}개의 완료 항목이 삭제되었습니다.`, 'warning');
      }
    });

    // Reset All Data
    elements.resetAllBtn.addEventListener('click', () => {
      elements.moreMenu.classList.remove('active');
      if (confirm('모든 할 일 데이터가 초기화됩니다. 계속하시겠습니까?')) {
        const previousTasks = state.tasks.map(task => ({ ...task }));
        state.tasks = DEFAULT_TASKS.map(task => ({ ...task }));
        saveLocalTasks();
        persistReplacedTaskSet(previousTasks, state.tasks);
        updateUI();
        showToast('데이터가 초기 상태로 복구되었습니다.', 'info');
      }
    });

    // Mark All Completed
    elements.markAllCompletedBtn.addEventListener('click', () => {
      const uncompleted = state.tasks.filter(t => !t.completed);
      if (uncompleted.length === 0) {
        showToast('이미 모든 항목이 완료되었습니다.', 'info');
        return;
      }
      state.tasks.forEach(t => t.completed = true);
      saveLocalTasks();
      persistUpdatedTasks(uncompleted);
      updateUI();
      AudioEngine.playCompleteSound();
      triggerCelebration(true);
      showToast('모든 할 일이 완료 처리되었습니다!', 'success');
    });

    // Edit Modal Events
    elements.editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveEditedTask();
    });

    elements.closeModalBtn.addEventListener('click', closeEditModal);
    elements.cancelEditBtn.addEventListener('click', closeEditModal);

    elements.editModal.addEventListener('click', (e) => {
      if (e.target === elements.editModal) {
        closeEditModal();
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Ignore if user is currently typing in an input/textarea
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        elements.searchInput.focus();
      } else if (e.key === 'Escape') {
        if (!elements.editModal.classList.contains('hidden')) {
          closeEditModal();
        }
        elements.moreMenu.classList.remove('active');
      }
    });
  }

  // --- Initial Setup ---
  async function init() {
    // Set Theme
    elements.appHtml.setAttribute('data-theme', state.theme);
    elements.themeIcon.setAttribute('data-lucide', state.theme === 'dark' ? 'sun' : 'moon');

    // Set Sound Icon
    elements.soundIcon.setAttribute('data-lucide', state.soundEnabled ? 'volume-2' : 'volume-x');

    // Set Random Quote
    const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    if (elements.dailyQuote) {
      elements.dailyQuote.textContent = randomQuote;
    }

    await loadTasks();
    initEvents();
    updateUI();

    if (supabaseUser && !supabaseLastError) {
      showToast('Supabase 데이터베이스에 연결되었습니다.', 'success');
    } else if (supabaseLastError) {
      showToast('Supabase 연결에 실패해 로컬 저장소를 사용합니다.', 'danger');
    }
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
