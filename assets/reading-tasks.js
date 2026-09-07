(function () {
  'use strict';
  function run() {
    const tasks = [...document.querySelectorAll('main .reading-task input[data-task-key]')];
    if (!tasks.length) return;
    const key = 'reading-tasks-v1:' + decodeURIComponent(location.pathname);
    let storage = true;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(saved)) tasks.forEach(task => {task.checked = saved.includes(task.dataset.taskKey);});
    } catch {storage = false;}
    const status = document.createElement('p');
    status.className = 'reading-task-status';
    status.setAttribute('role','status');
    tasks[0].closest('.reading-task-list').before(status);
    const update = () => {
      status.textContent = `本页已核对 ${tasks.filter(t => t.checked).length} / ${tasks.length} 项。${storage ? '勾选记录保存在当前浏览器。' : '无法保存，勾选仅本次有效。'}勾选不代表自动测试通过。`;
    };
    tasks.forEach(task => task.addEventListener('change', () => {
      try {localStorage.setItem(key,JSON.stringify(tasks.filter(t=>t.checked).map(t=>t.dataset.taskKey)));storage=true;}
      catch {storage=false;}
      update();
    }));
    update();
    // Curated cross-board pages already have a single stage-aware reading route.
    if (document.querySelector('.cross-layout')) return;
    const headings = [...document.querySelectorAll('main h2,main h3')].filter(h => /阶段|[ABC] 组/.test(h.textContent) && h.id);
    if (headings.length > 1) {
      const nav = document.createElement('nav');
      nav.className = 'reading-stage-nav';
      nav.setAttribute('aria-label','任务阶段跳转');
      headings.forEach(h => {const a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent.replace(/⭐.*$/,'').trim();nav.append(a);});
      (headings[0].closest('.lesson-subsection') || headings[0]).before(nav);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',run); else run();
})();
