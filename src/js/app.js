const TaskManager = {
  elements: {
    get: id => document.getElementById(id),
    query: selector => document.querySelector(selector),
    queryAll: selector => document.querySelectorAll(selector),
  },

  state: {
    currentTaskId: null,
    lists: ['ul-todo', 'ul-working', 'ul-urgent', 'ul-done'],
  },

  init() {
    this.loadSavedData();
    this.bindEvents();
    this.countTasks();
  },

  bindEvents() {
    const { get, query } = this.elements;

    // Add Task
    get('addToDo').addEventListener('click', () => this.addTask('ul-todo'));
    get('addUrgent').addEventListener('click', () => this.toggleUrgentList());
    get('deleteItem').addEventListener('click', () => this.deleteAllTasks());

    // Modal
    get('taskButton').addEventListener('click', () => this.saveTask());
    get('modalClose').addEventListener('click', () => this.closeModal());
    get('modalOverlay').addEventListener('click', () => this.closeModal());

    // Options
    get('toggleOptions').addEventListener('click', () => this.toggleOptions());
    get('boardFull').addEventListener('click', () => this.toggleFullHeight());
    get('optionCfrm').addEventListener('click', () => this.toggleDeleteWarning());
    get('optionOptns').addEventListener('click', () => this.clearOptions());
    get('boardOpac').addEventListener('input', e => this.setOpacity(e.target.value));

    // Background Options
    this.elements.queryAll('#bgOptions > span').forEach(span =>
      span.addEventListener('click', () => this.setBackground(span.dataset.bg))
    );
    get('submitUrl').addEventListener('click', () => this.setBackgroundUrl());

    // Import/Export
    get('impBrd').addEventListener('click', () => get('fileInput').click());
    get('fileInput').addEventListener('change', e => this.importBoard(e));
    get('expBrd').addEventListener('click', () => this.exportBoard());

    // Task Interactions
    this.bindTaskEvents();
  },

  addTask(listId) {
    const list = this.elements.get(listId);
    const id = this.generateTaskId();
    const task = document.createElement('li');
    task.id = `li-${id}`;
    task.draggable = true;
    task.innerHTML = `
      <span class="txt">New Task</span>
      <span class="idTask">${id}</span>
      <a class="up" href="#" aria-label="Move up">↑</a>
      <a class="down" href="#" aria-label="Move down">↓</a>
      <a class="delete" href="#" aria-label="Delete task">✕</a>
    `;
    task.addEventListener('dragstart', e => this.drag(e));
    task.addEventListener('touchstart', e => this.drag(e));
    list.prepend(task);
    this.bindTaskEvents();
    this.editTask(task);
    this.countTasks();
    this.saveBoards();
  },

  generateTaskId() {
    const tasks = this.elements.queryAll('li');
    if (!tasks.length) return '0001';
    const ids = Array.from(tasks).map(task => parseInt(task.id.slice(3)));
    const maxId = Math.max(...ids) + 1;
    return maxId.toString().padStart(4, '0');
  },

  editTask(task) {
    const txt = task.querySelector('.txt');
    txt.click();
  },

  bindTaskEvents() {
    const { queryAll } = this.elements;
    queryAll('.task-list li').forEach(task => {
      task.querySelector('.txt').addEventListener('click', () => this.openModal(task.id));
      task.querySelector('.up').addEventListener('click', e => this.moveTask(e, 'up'));
      task.querySelector('.down').addEventListener('click', e => this.moveTask(e, 'down'));
      task.querySelector('.delete').addEventListener('click', e => this.deleteTask(e, task));
    });
    queryAll('.task-list').forEach(list => {
      list.addEventListener('drop', e => this.drop(e, list));
      list.addEventListener('dragover', e => e.preventDefault());
      list.addEventListener('dragenter', e => list.classList.add('drag-enter'));
      list.addEventListener('dragleave', e => list.classList.remove('drag-enter'));
    });
  },

  openModal(taskId) {
    const { get } = this.elements;
    this.state.currentTaskId = taskId;
    const task = get(taskId);
    const listId = task.parentNode.id;
    const modal = get('modalBox');
    modal.className = `modal b-${listId}`;
    get('taskText').value = task.querySelector('.txt').innerText;
    get('modalOverlay').style.display = 'block';
    modal.style.display = 'block';
    get('taskText').focus();
  },

  saveTask() {
    const { get } = this.elements;
    const text = get('taskText').value.trim();
    if (!text) {
      get('taskText').placeholder = 'Please enter a task description';
      return;
    }
    const task = get(this.state.currentTaskId);
    task.querySelector('.txt').innerText = text;
    this.closeModal();
    this.saveBoards();
  },

  closeModal() {
    const { get } = this.elements;
    get('modalOverlay').style.display = 'none';
    get('modalBox').style.display = 'none';
  },

  deleteTask(e, task) {
    e.preventDefault();
    if (localStorage.getItem('OptHideConfirm')) {
      task.remove();
      this.countTasks();
      this.saveBoards();
    } else {
      this.showConfirm('Task', () => {
        task.remove();
        this.countTasks();
        this.saveBoards();
      });
    }
  },

  deleteAllTasks() {
    if (this.elements.get('totalTask').innerText === '0') return;
    if (localStorage.getItem('OptHideConfirm')) {
      this.clearBoards();
    } else {
      this.showConfirm('All Tasks', () => this.clearBoards());
    }
  },

  clearBoards() {
    this.state.lists.forEach(id => {
      if (this.elements.get(id)) this.elements.get(id).innerHTML = '';
    });
    localStorage.removeItem('listToDo');
    localStorage.removeItem('listWorking');
    localStorage.removeItem('listUrgent');
    localStorage.removeItem('listDone');
    this.countTasks();
  },

  showConfirm(title, onConfirm) {
    const { get } = this.elements;
    get('confirmTitle').innerText = title;
    get('confirmDelete').style.display = 'block';
    get('confirmBox').style.display = 'block';
    const confirmBtn = get('confirmBtn');
    const cancelBtn = get('confirmCls');
    const dontShow = get('dontShowAgain');

    const confirmHandler = () => {
      if (dontShow.checked) localStorage.setItem('OptHideConfirm', 'true');
      onConfirm();
      this.closeConfirm();
    };
    const cancelHandler = () => {
      if (dontShow.checked) localStorage.setItem('OptHideConfirm', 'true');
      this.closeConfirm();
    };

    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    get('confirmBtn').addEventListener('click', confirmHandler);
    get('confirmCls').addEventListener('click', cancelHandler);
  },

  closeConfirm() {
    const { get } = this.elements;
    get('confirmDelete').style.display = 'none';
    get('confirmBox').style.display = 'none';
    get('confirmUrgent').style.display = 'none';
  },

  toggleUrgentList() {
    const { get } = this.elements;
    const urgentList = get('ur-gent');
    if (urgentList) {
      const taskCount = urgentList.querySelector('ul').childElementCount;
      if (taskCount === 0) {
        this.removeUrgentList();
      } else if (localStorage.getItem('OptHideConfirmUrgent')) {
        this.removeUrgentList();
      } else {
        this.showUrgentConfirm(taskCount);
      }
    } else {
      this.addUrgentList();
    }
  },

  addUrgentList() {
    const { get } = this.elements;
    get('myLists').classList.add('fourCol');
    const urgentSection = document.createElement('section');
    urgentSection.id = 'ur-gent';
    urgentSection.innerHTML = `
      <h2>Urgent <span class="task-count">0</span></h2>
      <ul id="ul-urgent" class="task-list" data-list="urgent"></ul>
    `;
    get('myLists').insertBefore(urgentSection, get('do-ne'));
    get('addUrgent').classList.add('active');
    this.bindTaskEvents();
    this.saveBoards();
  },

  removeUrgentList() {
    const { get } = this.elements;
    get('myLists').classList.remove('fourCol');
    get('ur-gent')?.remove();
    get('addUrgent').classList.remove('active');
    localStorage.removeItem('listUrgent');
    this.saveBoards();
  },

  showUrgentConfirm(taskCount) {
    const { get } = this.elements;
    get('numTaskUrg').innerText = taskCount;
    get('pluralTsk').style.display = taskCount === 1 ? 'none' : 'inline';
    get('confirmDelete').style.display = 'block';
    get('confirmUrgent').style.display = 'block';
    const confirmBtn = get('confirmUrgentBtn');
    const cancelBtn = get('confirmUrgentCls');
    const dontShow = get('dontShowAgainUrgent');

    const confirmHandler = () => {
      if (dontShow.checked) localStorage.setItem('OptHideConfirmUrgent', 'true');
      this.removeUrgentList();
      this.closeConfirm();
    };
    const cancelHandler = () => {
      if (dontShow.checked) localStorage.setItem('OptHideConfirmUrgent', 'true');
      this.closeConfirm();
    };

    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    get('confirmUrgentBtn').addEventListener('click', confirmHandler);
    get('confirmUrgentCls').addEventListener('click', cancelHandler);
  },

  drag(e) {
    e.dataTransfer.setData('text', e.target.id);
  },

  drop(e, list) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text');
    const task = this.elements.get(taskId);
    list.appendChild(task);
    task.removeAttribute('style');
    list.classList.remove('drag-enter');
    this.countTasks();
    this.saveBoards();
  },

  moveTask(e, direction) {
    e.preventDefault();
    const task = e.target.parentElement;
    const sibling = direction === 'up' ? task.previousElementSibling : task.nextElementSibling;
    if (sibling) {
      task.parentNode.insertBefore(task, direction === 'up' ? sibling : sibling.nextSibling);
      this.saveBoards();
    }
  },

  countTasks() {
    const { get, queryAll } = this.elements;
    let total = 0;
    queryAll('.task-list').forEach(list => {
      const count = list.childElementCount;
      list.parentElement.querySelector('.task-count').innerText = count;
      total += count;
    });
    get('totalTask').innerText = total;
  },

  saveBoards() {
    this.state.lists.forEach(id => {
      const list = this.elements.get(id);
      if (list) localStorage.setItem(`list${id.replace('ul-', '')}`, list.innerHTML);
    });
  },

  loadSavedData() {
    const { get } = this.elements;
    this.state.lists.forEach(id => {
      const data = localStorage.getItem(`list${id.replace('ul-', '')}`);
      if (data) get(id).innerHTML = data;
    });
    if (localStorage.getItem('listUrgent')) {
      this.addUrgentList();
      get('ul-urgent').innerHTML = localStorage.getItem('listUrgent');
    }
    if (localStorage.getItem('OptShowOptions')) {
      get('optionsPanel').classList.add('opened');
      get('toggleOptions').innerText = 'Close';
    }
    if (localStorage.getItem('OptBackgroundImage')) {
      const bg = localStorage.getItem('OptBackgroundImage').toLowerCase();
      if (bg === 'url') {
        const url = localStorage.getItem('OptBackgroundImageUrl');
        get('bg-image').style.backgroundImage = `url(${url})`;
      } else if (bg !== 'none') {
        get('bg-image').className = `overlay-bg ${bg}`;
      }
      this.elements.queryAll('#bgOptions > span').forEach(span => {
        if (span.dataset.bg === bg) span.classList.add('selected');
      });
    }
    if (localStorage.getItem('OptFullBoard')) {
      get('boardFull').classList.add('active');
      get('myLists').classList.add('full');
    }
    if (localStorage.getItem('OptOpacityLevel')) {
      const value = localStorage.getItem('OptOpacityLevel');
      get('boardOpac').value = value;
      this.setOpacity(value);
    }
    if (localStorage.getItem('OptHideConfirm')) {
      get('optionCfrm').classList.add('active');
    }
    this.bindTaskEvents();
    this.countTasks();
  },

  toggleOptions() {
    const { get } = this.elements;
    const options = get('optionsPanel');
    options.classList.toggle('opened');
    get('toggleOptions').innerText = options.classList.contains('opened') ? 'Close' : 'Options';
    localStorage.setItem('OptShowOptions', options.classList.contains('opened') ? 'true' : '');
  },

  toggleFullHeight() {
    const { get } = this.elements;
    const isActive = get('boardFull').classList.toggle('active');
    get('myLists').classList.toggle('full');
    localStorage.setItem('OptFullBoard', isActive ? 'true' : '');
  },

  setOpacity(value) {
    const opacity = value === '10' ? 1 : `0.${value}`;
    this.elements.queryAll('#myLists > section').forEach(section => {
      section.style.background = `rgba(247, 247, 247, ${opacity})`;
    });
    localStorage.setItem('OptOpacityLevel', value);
  },

  toggleDeleteWarning() {
    const { get } = this.elements;
    const isActive = get('optionCfrm').classList.toggle('active');
    localStorage.setItem('OptHideConfirm', isActive ? '' : 'true');
  },

  clearOptions() {
    localStorage.clear();
    location.reload();
  },

  setBackground(bg) {
    const { get, queryAll } = this.elements;
    queryAll('#bgOptions > span').forEach(span => span.classList.remove('selected'));
    get('bg-image').className = `overlay-bg ${bg}`;
    get('byUrl').style.display = bg === 'url' ? 'block' : 'none';
    localStorage.setItem('OptBackgroundImage', bg);
    if (bg !== 'url') {
      get('bg-image').removeAttribute('style');
      localStorage.removeItem('OptBackgroundImageUrl');
    }
    queryAll('#bgOptions > span').forEach(span => {
      if (span.dataset.bg === bg) span.classList.add('selected');
    });
  },

  setBackgroundUrl() {
    const { get } = this.elements;
    const url = get('urlImage').value;
    if (url) {
      get('bg-image').style.backgroundImage = `url(${url})`;
      localStorage.setItem('OptBackgroundImageUrl', url);
    }
  },

  importBoard(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const data = JSON.parse(e.target.result);
      Object.keys(data).forEach(key => {
        if (data[key] === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, data[key]);
        }
      });
      location.reload();
    };
    reader.readAsText(file);
  },

  exportBoard() {
    if (!localStorage.length) {
      alert('Nothing to export.');
      return;
    }
    const dataToSave = {
      listToDo: localStorage.getItem('listToDo'),
      listWorking: localStorage.getItem('listWorking'),
      listDone: localStorage.getItem('listDone'),
      listUrgent: localStorage.getItem('listUrgent') || null,
      OptShowOptions: localStorage.getItem('OptShowOptions'),
      OptBackgroundImage: localStorage.getItem('OptBackgroundImage'),
      OptFullBoard: localStorage.getItem('OptFullBoard'),
      OptOpacityLevel: localStorage.getItem('OptOpacityLevel'),
      OptHideConfirm: localStorage.getItem('OptHideConfirm'),
      OptHideConfirmUrgent: localStorage.getItem('OptHideConfirmUrgent'),
      OptBackgroundImageUrl: localStorage.getItem('OptBackgroundImageUrl')
    };
    const fileContent = JSON.stringify(dataToSave);
    const blob = new Blob([fileContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = this.elements.get('expHidden');
    link.href = url;
    link.download = 'saved-board.tms';
    link.click();
    URL.revokeObjectURL(url);
  },
};

TaskManager.init();