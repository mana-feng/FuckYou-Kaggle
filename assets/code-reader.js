/* Shared, offline code reader. The original text is the clipboard authority. */
(function () {
  'use strict';
  if (window.CodeReader) return;
  const records = new WeakMap();
  const icons = {
    copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    expand:'<path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/>',
    wrap:'<path d="M4 6h16M4 11h12a4 4 0 0 1 0 8h-4M4 17h3M14 16l-3 3 3 3"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>'
  };
  const escape = text => text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const icon = name => `<svg class="cr-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
  const button = (action, label, title, glyph = action) => `<button type="button" class="cr-button" data-cr-action="${action}" aria-label="${escape(label + '：' + title)}">${icon(glyph)}${label}</button>`;
  let dialog, opener, statusTimer, sequence = 0;
  const narrow = () => matchMedia('(max-width:600px)').matches;
  const terminalLanguages = new Set(['bash','sh','shell','console','powershell','ps1','bat','cmd','dos','shell-session']);
  const languageLabels = {python:'Python',py:'Python',sql:'SQL',cpp:'C++',c:'C',cxx:'C++',javascript:'JavaScript',js:'JavaScript',typescript:'TypeScript',ts:'TypeScript',tsx:'TSX',jsx:'JSX',json:'JSON',yaml:'YAML',yml:'YAML',html:'HTML',css:'CSS',rust:'Rust',go:'Go',dockerfile:'Dockerfile',bash:'终端 · Bash',sh:'终端 · Shell',shell:'终端',console:'终端',powershell:'终端 · PowerShell',ps1:'终端 · PowerShell',bat:'终端 · CMD',cmd:'终端 · CMD',text:'代码',plaintext:'代码'};

  function languageFor(host, raw) {
    const declared = host.dataset.codeLanguage || host.querySelector('[class*="language-"]')?.className.match(/language-([\w+-]+)/)?.[1];
    if (declared) return declared.toLowerCase();
    // Frozen HTML has no Markdown language metadata. Use only clear syntax;
    // uncertain fragments stay "代码", rather than inventing a language/runtime.
    if (/^\s*(?:from [\w.]+ import |import [\w.]+|def \w+\([^\n]*\):|class \w+[^\n]*:)/m.test(raw)) return 'python';
    if (/^\s*(?:SELECT\s|WITH\s+\w+\s+AS\s*\(|CREATE\s+TABLE\s|EXPLAIN\s)/mi.test(raw)) return 'sql';
    if (/^\s*#include\s*[<"]/.test(raw)) return 'cpp';
    if (/^\s*(?:python(?:3)?\s|pip(?:3)?\s|npm\s|git\s|docker\s|curl\s)/m.test(raw)) return 'shell';
    return 'text';
  }

  function titleFor(host) {
    const authored = host.dataset.codeTitle || host.closest('[data-code-title]')?.dataset.codeTitle;
    if (authored) return authored;
    const main = host.closest('main');
    const headings = main ? [...main.querySelectorAll('h2,h3,h4')] : [];
    const preceding = headings.filter(h => (h.compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING) && !h.contains(host));
    const title = preceding.at(-1)?.textContent.replace(/^[^\p{L}\p{N}]+/u,'').trim() || '本节代码';
    return title.length > 56 ? title.slice(0,56) + '…' : title;
  }

  function splitMarkup(pre, raw) {
    const lines = [''];
    function walk(node, wrappers) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue.split('\n').forEach((part, i) => {
          if (i) lines.push('');
          if (part) lines[lines.length - 1] += wrappers.map(c=>`<span class="${escape(c)}">`).join('') + escape(part) + '</span>'.repeat(wrappers.length);
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const next = node.tagName === 'SPAN' && node.className ? [...wrappers, node.className] : wrappers;
        node.childNodes.forEach(child => walk(child, next));
      }
    }
    pre.childNodes.forEach(node => walk(node, []));
    if (raw.endsWith('\n')) lines.pop();
    return lines.map((line,i) => `<span class="cr-line" data-line="${i+1}"><span class="cr-line-content">${line}</span></span>` + (i < lines.length - 1 || raw.endsWith('\n') ? '\n' : '')).join('');
  }

  function announce(message) {
    let status = document.querySelector('#code-reader-status');
    if (!status) {
      status = document.createElement('div'); status.id = 'code-reader-status'; status.className = 'cr-status';
      status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); document.body.append(status);
    }
    // Keep feedback inside the modal top layer while it is open.
    (dialog?.open ? dialog : document.body).append(status);
    clearTimeout(statusTimer); status.textContent = message; status.classList.add('cr-visible');
    statusTimer = setTimeout(() => status.classList.remove('cr-visible'), 2800);
  }

  async function copyText(raw) {
    if (navigator.clipboard && isSecureContext) {
      try { await navigator.clipboard.writeText(raw); return; } catch { /* user-initiated local-file fallback */ }
    }
    const previous = document.activeElement;
    const input = document.createElement('textarea'); input.value = raw; input.readOnly = true;
    input.setAttribute('aria-label','完整代码'); input.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0';
    (dialog?.open ? dialog : document.body).append(input);
    try { input.select(); if (!document.execCommand('copy')) throw new Error('Clipboard unavailable'); }
    finally { input.remove(); previous?.focus({preventScroll:true}); }
  }

  function updateHint(card) {
    const pre = card.querySelector('.cr-pre'), hint = card.querySelector('.cr-hint');
    if (pre && hint) hint.hidden = pre.clientWidth === 0 || pre.scrollWidth <= pre.clientWidth + 1;
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => entries.forEach(e => updateHint(e.target.closest('.cr-card')))) : null;

  function bindCard(card, record, enlarged = false) {
    records.set(card, record);
    const terminal = terminalLanguages.has(record.language);
    card.classList.add('cr-card'); card.classList.toggle('cr-terminal', terminal);
    card.classList.toggle('cr-wrap', narrow() || terminal);
    const pre = card.querySelector('pre'); pre.classList.add('cr-pre'); pre.tabIndex = 0;
    pre.setAttribute('aria-label',`${record.title}，${record.lines} 行代码；超宽时可用左右键滚动`);
    const toolbar = document.createElement('div'); toolbar.className='cr-toolbar';
    toolbar.innerHTML = `<div class="cr-title"><span class="cr-language">${escape(languageLabels[record.language] || record.language)}</span><span>${escape(record.title)}</span></div><div class="cr-actions">${button('wrap','换行',record.title)}${button('copy','复制',record.title)}${enlarged ? '' : button('expand','放大',record.title)}</div>`;
    toolbar.querySelector('[data-cr-action="wrap"]').setAttribute('aria-pressed',String(card.classList.contains('cr-wrap')));
    const footer = document.createElement('div'); footer.className='cr-footer';
    footer.innerHTML=`<span>${record.lines} 行 · 复制不含行号与讲解</span><span class="cr-hint" hidden>左右滑动查看完整代码 ↔</span>`;
    card.prepend(toolbar); card.append(footer);
    card.addEventListener('click', async event => {
      const trigger = event.target.closest('[data-cr-action]'); if (!trigger) return;
      const action = trigger.dataset.crAction;
      if (action === 'wrap') { trigger.setAttribute('aria-pressed', String(card.classList.toggle('cr-wrap'))); updateHint(card); }
      if (action === 'expand') openDialog(record, trigger, card);
      if (action === 'copy') {
        trigger.disabled = true;
        try { await copyText(record.raw); announce(`已复制完整代码，共 ${record.lines} 行`); }
        catch { announce('未能自动复制，请选中代码后使用系统复制快捷键。'); }
        finally { trigger.disabled = false; }
      }
    });
    observer?.observe(pre); updateHint(card);
  }

  function openDialog(record, trigger, originalCard) {
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id='site-code-reader'; dialog.setAttribute('aria-labelledby','site-code-title');
      dialog.innerHTML=`<div class="cr-dialog-header"><div><small>放大阅读 · 完整代码</small><h2 id="site-code-title"></h2></div><button type="button" class="cr-button" data-cr-close>${icon('close')}关闭</button></div><div class="cr-dialog-content"></div>`;
      document.body.append(dialog);
      dialog.querySelector('[data-cr-close]').addEventListener('click',()=>dialog.close());
      dialog.addEventListener('click',event=>{
        if (event.target !== dialog) return;
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
      });
      dialog.addEventListener('close',()=>{
        document.body.classList.remove('cr-modal-open');
        const status = dialog.querySelector('.cr-status'); if (status) { status.classList.remove('cr-visible'); document.body.append(status); }
        opener?.focus({preventScroll:true});
      });
    }
    opener = trigger;
    dialog.querySelector('#site-code-title').textContent=record.title;
    const oldPre = dialog.querySelector('pre'); if (oldPre) observer?.unobserve(oldPre);
    const clone = document.createElement('div'); clone.className='codehilite';
    const pre = originalCard.querySelector('pre').cloneNode(true); pre.removeAttribute('id');
    pre.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
    clone.append(pre); bindCard(clone,record,true);
    dialog.querySelector('.cr-dialog-content').replaceChildren(clone);
    dialog.showModal(); document.body.classList.add('cr-modal-open'); dialog.querySelector('[data-cr-close]').focus();
    requestAnimationFrame(()=>updateHint(clone));
  }

  function addFold(card, record) {
    if (record.lines < 30 || card.closest('details,.cr-study')) return;
    const fold = document.createElement('details'); fold.className='cr-fold'; fold.open=true;
    const summary = document.createElement('summary');
    summary.innerHTML=`<span>${escape(record.title)} · 完整代码</span><span class="cr-fold-meta">${record.lines} 行 · 点击收起 / 展开</span>`;
    card.before(fold); fold.append(summary,card);
    const end = document.createElement('div'); end.className='cr-fold-end';
    const close = document.createElement('button'); close.type='button'; close.className='cr-button'; close.textContent='收起这段代码 ↑';
    close.addEventListener('click',()=>{fold.open=false;summary.focus({preventScroll:true});summary.scrollIntoView({block:'center',behavior:'instant'});});
    end.append(close); fold.append(end);
    fold.addEventListener('toggle',()=>updateHint(card));
  }

  function bindNotes(study, card, record) {
    const notes = [...study.querySelectorAll('[data-code-lines]')];
    if (!notes.length) return;
    study.classList.add('cr-has-notes');
    notes.forEach(note=>{
      const [start,end=start] = note.dataset.codeLines.split('-').map(Number);
      if (!(start >= 1 && end >= start && end <= record.lines)) { note.disabled=true; return; }
      note.setAttribute('aria-controls',card.querySelector('pre').id); note.setAttribute('aria-pressed','false');
      note.addEventListener('click',()=>{
        const select = note.getAttribute('aria-pressed') !== 'true';
        notes.forEach(n=>n.setAttribute('aria-pressed',String(n === note && select)));
        card.querySelectorAll('.cr-line').forEach(line=>line.classList.toggle('cr-focused',select && +line.dataset.line >= start && +line.dataset.line <= end));
        if (select) {
          const target = card.querySelector(`.cr-line[data-line="${start}"]`), r=target.getBoundingClientRect();
          if (r.top < 65 || r.bottom > innerHeight) target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
          announce(`已高亮第 ${start}${end > start ? '–'+end : ''} 行；再次点击取消`);
        }
      });
    });
  }

  function enhance(root) {
    root.querySelectorAll('.codehilite').forEach(card=>{
      if (records.has(card) || card.closest('dialog,svg,.visual-block,[data-code-reader="off"]')) return;
      const pre = card.querySelector('pre'); if (!pre || !pre.textContent.trim()) return;
      const raw = pre.textContent;
      const record = {raw, title:titleFor(card), language:languageFor(card,raw), lines:raw.replace(/\n$/,'').split('\n').length};
      const markup = splitMarkup(pre,raw);
      pre.innerHTML='<code>'+markup+'</code>';
      // Bail out on unfamiliar markup rather than silently altering executable text.
      if (pre.textContent !== raw) { pre.textContent=raw; }
      if (!pre.id) pre.id=`code-reader-${++sequence}`;
      bindCard(card,record); addFold(card,record);
      const study=card.closest('.cr-study'); if(study) bindNotes(study,card,record);
    });
  }

  window.CodeReader={enhance, raw:card=>records.get(card)?.raw};
  function run() {
    const main=document.querySelector('main'); if (!main) return;
    enhance(main);
    document.addEventListener('toggle', event=>{if(event.target.tagName==='DETAILS') event.target.querySelectorAll('.cr-card').forEach(updateHint);},true);
    window.CodeReader.ready=true;
  }
  // Let existing non-code/output compatibility transforms finish first. Adding
  // line spans before visual-blocks runs would make prose look syntax-highlighted.
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0)); else setTimeout(run,0);
})();
