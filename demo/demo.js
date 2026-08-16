(function () {
  var toastTimer;

  function showToast(message) {
    var toast = document.querySelector('[data-demo-toast]');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('data-demo-toast', '');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('visible');
    }, 2600);
  }

  function updateText(selector, text) {
    var element = document.querySelector(selector);
    if (element) element.textContent = text;
  }

  function updatePageTitle(title) {
    var titleElement = document.querySelector('[data-mini-title]');
    if (titleElement) titleElement.textContent = title;
  }

  function setView(viewName, title) {
    var views = document.querySelectorAll('[data-mini-view]');
    views.forEach(function (view) {
      view.hidden = view.getAttribute('data-mini-view') !== viewName;
    });
    var backButton = document.querySelector('[data-mini-back]');
    if (backButton) {
      var canReturnToProfile = viewName === 'admin-management' || viewName === 'profile-tool';
      backButton.disabled = viewName !== 'ai-chat' && !canReturnToProfile;
      backButton.setAttribute('data-demo-action', canReturnToProfile ? 'back-profile' : 'back-ai');
    }
    if (title) updatePageTitle(title);
    updateText('[data-tab-status]', '当前页面：' + (title || '书单'));
  }

  function switchTab(target) {
    var buttons = document.querySelectorAll('[data-tab-button]');
    buttons.forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-tab-button') === target);
    });

    var view = 'books';
    var title = '书单首页';
    if (target === '伴读') {
      view = 'ai-sessions';
      title = 'AI伴读';
    } else if (target === '我的') {
      view = 'profile';
      title = document.body.getAttribute('data-profile-title') || '我的';
    }
    setView(view, title);
    showToast('已切换到“' + target + '”页面（静态演示）。');
  }

  function showChat(message) {
    setView('ai-chat', 'AI伴读');
    document.querySelectorAll('[data-tab-button]').forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-tab-button') === '伴读');
    });
    if (message) updateText('[data-chat-status]', message);
  }

  function appendChatMessage(role, content) {
    var list = document.querySelector('[data-chat-messages]');
    if (!list) return;
    var empty = list.querySelector('.ai-messages__empty');
    if (empty) empty.remove();
    var item = document.createElement('div');
    item.className = 'chat-message chat-message--' + role;
    item.textContent = content;
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
  }

  function resetChatForm() {
    var question = document.querySelector('[data-chat-question]');
    var context = document.querySelector('[data-chat-context]');
    var image = document.querySelector('[data-image-name]');
    if (question) question.value = '';
    if (context) context.value = '';
    if (image) image.textContent = '未选择图片';
    var preview = document.querySelector('[data-image-preview]');
    if (preview) preview.hidden = true;
  }

  function filterBooks() {
    var list = document.querySelector('[data-book-list]');
    if (!list) return;
    var search = (document.querySelector('[data-book-search]')?.value || '').trim().toLowerCase();
    var field = document.querySelector('[data-book-field]')?.value || 'all';
    var cards = Array.prototype.slice.call(list.querySelectorAll('[data-book-card]'));
    var visible = 0;
    cards.forEach(function (card) {
      var title = (card.getAttribute('data-title') || '').toLowerCase();
      var author = (card.getAttribute('data-author') || '').toLowerCase();
      var value = field === 'title' ? title : field === 'author' ? author : title + ' ' + author;
      var matches = !search || value.indexOf(search) !== -1;
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    updateText('[data-filter-status]', search ? '已找到 ' + visible + ' 本匹配书籍' : '共 ' + visible + ' 本示例书籍');
  }

  function sortBooks() {
    var list = document.querySelector('[data-book-list]');
    var sort = document.querySelector('[data-book-sort]')?.value || 'recent';
    if (!list) return;
    var cards = Array.prototype.slice.call(list.querySelectorAll('[data-book-card]'));
    cards.sort(function (left, right) {
      var leftValue = left.getAttribute('data-' + sort) || '';
      var rightValue = right.getAttribute('data-' + sort) || '';
      return leftValue.localeCompare(rightValue, 'zh-CN', { numeric: true });
    });
    cards.forEach(function (card) { list.appendChild(card); });
    var sortLabels = { recent: '最近加入', title: '书名 A-Z', author: '作者 A-Z' };
    updateText('[data-order-status]', '当前顺序：' + (sortLabels[sort] || sortLabels.recent) + '。切换后会从第一页重新加载。');
    filterBooks();
  }

  var profileToolLabels = {
    notes: '笔记与打卡',
    reading: '阅读计划',
    reservations: '我的预约',
    community: '班级与小组',
    tasks: '阅读任务',
    ranking: '行为排行榜',
  };

  function toolHeader(title) {
    return '<div class="tool-page-head"><button class="mini-button mini-button--secondary" data-demo-action="back-profile">‹ 返回个人中心</button><h2 class="tool-page-head__title">' + title + '</h2></div>';
  }

  function profileToolMarkup(tool, role) {
    var isReviewer = role === 'teacher' || role === 'admin';
    if (tool === 'notes') {
      return toolHeader('笔记与打卡') +
        '<div class="tool-stat-grid"><div><strong>3</strong><span>连续打卡天数</span></div><div><strong>90</strong><span>累计阅读分钟</span></div></div>' +
        '<div class="mini-card tool-card"><label class="tool-label" for="tool-note-book">当前书籍</label><input id="tool-note-book" class="tool-input" value="metadata_communist" placeholder="请输入书籍 ID（可从书籍详情页进入）"></div>' +
        '<div class="mini-card tool-card"><div class="tool-inline"><input class="tool-input" value="30" type="number" aria-label="阅读分钟数"><button class="mini-button" data-demo-action="tool-checkin">完成打卡</button></div><p class="mini-status" data-tool-status>今天还没有打卡。</p></div>' +
        '<div class="mini-card tool-card"><textarea class="tool-textarea" placeholder="写下阅读笔记">这是一条本地演示笔记。</textarea><button class="mini-button" data-demo-action="tool-save-note">保存笔记</button><p class="mini-status" data-tool-note-status></p></div>' +
        '<div class="mini-card tool-list-item"><strong>示例笔记</strong><span>关于《共产党宣言》的核心观点</span><button class="mini-button mini-button--quiet" data-demo-action="tool-delete-note">删除</button></div>';
    }
    if (tool === 'reading') {
      return toolHeader('阅读计划') +
        '<div class="tool-stat-grid tool-stat-grid--four"><div><strong>2</strong><span>连续打卡</span></div><div><strong>90</strong><span>阅读分钟</span></div><div><strong>1</strong><span>完成计划</span></div><div><strong>4</strong><span>行为记录</span></div></div>' +
        '<div class="mini-card tool-card"><div class="tool-inline"><input class="tool-input" value="metadata_communist" placeholder="书籍 ID"><button class="mini-button" data-demo-action="tool-start-reading">开始计划</button></div><p class="mini-status" data-tool-status>填写书籍 ID 后开始新的阅读计划。</p></div>' +
        '<div class="mini-card tool-list-item"><div><strong>metadata_communist</strong><span>进行中</span></div><button class="mini-button mini-button--secondary" data-demo-action="tool-complete-plan">完成计划</button></div>';
    }
    if (tool === 'reservations') {
      return toolHeader('我的预约') +
        '<div class="tool-notice">当前使用安全的本地预约模拟，不会访问真实图书馆账号。</div>' +
        '<div class="mini-card tool-list-item"><div><strong>metadata_communist</strong><span>pending · Mock Provider</span><span>示例预约已创建，等待馆藏确认。</span></div><button class="mini-button mini-button--quiet" data-demo-action="tool-cancel-reservation">取消预约</button></div>';
    }
    if (tool === 'community') {
      var groupCreate = isReviewer ? '<button class="mini-button mini-button--secondary" data-demo-action="tool-create-group">创建班级</button>' : '';
      return toolHeader('班级与小组') +
        '<div class="tool-notice tool-notice--blue">本地演示已预置“示例阅读班”和“名著讨论小组”，可直接查看成员、任务和排行榜。</div>' +
        '<div class="mini-card tool-card"><h3 class="tool-card__title">创建班级或阅读小组</h3><input class="tool-input" placeholder="请输入名称"><div class="tool-action-row"><button class="mini-button mini-button--secondary" data-demo-action="tool-create-group">阅读小组</button>' + groupCreate + '<button class="mini-button" data-demo-action="tool-create-group">创建</button></div><p class="mini-status" data-tool-status></p></div>' +
        '<div class="mini-card tool-card"><h3 class="tool-card__title">通过邀请码加入</h3><input class="tool-input" placeholder="请输入邀请码，例如 READ2026"><button class="mini-button" data-demo-action="tool-join-group">加入</button><p class="mini-status" data-tool-status></p></div>' +
        '<div class="mini-card tool-group"><div><strong>示例阅读班</strong><span>班级 · 邀请码 READ2026 · 2 名成员</span></div><div class="tool-action-row"><button class="mini-button mini-button--quiet" data-demo-action="tool-toggle-members">查看成员</button><button class="mini-button mini-button--quiet" data-demo-action="tool-open-task">任务</button><button class="mini-button mini-button--quiet" data-demo-action="tool-open-ranking">排行榜</button></div><div class="tool-members" data-tool-members hidden>管理员（教师）<br>阅读者（学生）</div></div>';
    }
    if (tool === 'tasks') {
      var reviewerPanel = isReviewer ? '<div class="mini-card tool-card"><h3 class="tool-card__title">发布阅读任务</h3><input class="tool-input" value="《共产党宣言》人物讨论"><textarea class="tool-textarea">写下一个印象最深的观点，并说明理由。</textarea><button class="mini-button" data-demo-action="tool-publish-task">发布任务</button><p class="mini-status" data-tool-status></p></div>' : '';
      var taskAction = isReviewer
        ? '<div class="tool-action-row"><button class="mini-button" data-demo-action="tool-review-confirm">确认完成</button><button class="mini-button mini-button--danger" data-demo-action="tool-review-return">退回修改</button></div>'
        : '<textarea class="tool-textarea" placeholder="写下你的阅读回答或问题"></textarea><button class="mini-button" data-demo-action="tool-submit-task">提交回答</button>';
      return toolHeader('阅读任务') +
        '<div class="mini-card tool-card"><div class="tool-inline"><span class="tool-label">当前分组</span><button class="mini-button mini-button--secondary">示例阅读班</button></div></div>' + reviewerPanel +
        '<div class="mini-card tool-card"><strong class="tool-card__title">《共产党宣言》人物讨论</strong><span class="tool-muted">进行中 · 截止：2026-08-23</span><p class="tool-description">写下一个印象最深的观点，并说明理由。</p><div class="tool-task-area">' + taskAction + '</div><p class="mini-status" data-tool-status></p></div>';
    }
    return toolHeader('行为排行榜') +
      '<div class="tool-notice">排行榜只统计服务端记录的打卡、完成计划、任务提交、教师确认和小组参与，不代表整本书的理解能力排名。</div>' +
      '<div class="mini-card tool-card"><div class="tool-inline"><button class="mini-button mini-button--secondary">查看范围：全平台</button><button class="mini-button" data-demo-action="tool-refresh-ranking">刷新</button></div></div>' +
      '<div class="mini-card tool-ranking-row"><strong>第 1 名</strong><span>阅读者<br><small>3 条有效记录</small></span><b>16 分</b></div>' +
      '<div class="mini-card tool-ranking-row"><strong>第 2 名</strong><span>另一位同学<br><small>1 条任务提交</small></span><b>8 分</b></div><p class="mini-status" data-tool-status></p>';
  }

  function openProfileTool(tool) {
    var label = profileToolLabels[tool] || '功能页面';
    var host = document.querySelector('[data-profile-tool-content]');
    var role = document.body.getAttribute('data-role') || 'student';
    if (host) host.innerHTML = profileToolMarkup(tool, role);
    updateText('[data-profile-status]', '已打开“' + label + '”（静态演示，真实版本进入对应小程序页面）。');
    setView('profile-tool', label);
    document.querySelectorAll('[data-tab-button]').forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-tab-button') === '我的');
    });
    showToast('已打开“' + label + '”页面。');
  }

  document.addEventListener('click', function (event) {
    var tab = event.target.closest('[data-tab-button]');
    if (tab) {
      switchTab(tab.getAttribute('data-tab-button'));
      return;
    }

    var target = event.target.closest('[data-demo-action]');
    if (!target) return;

    var action = target.getAttribute('data-demo-action');
    if (action === 'open-profile-tool') {
      var profileTool = target.getAttribute('data-profile-tool') || '';
      openProfileTool(profileTool);
      return;
    }
    if (action === 'open-admin') {
      setView('admin-management', '书籍管理');
      showToast('已进入书籍管理页面。');
      return;
    }
    if (action === 'back-profile') {
      setView('profile', '个人中心');
      document.querySelectorAll('[data-tab-button]').forEach(function (button) {
        button.classList.toggle('active', button.getAttribute('data-tab-button') === '我的');
      });
      showToast('已返回个人中心。');
      return;
    }
    if (action === 'admin-add-book') {
      var adminForm = document.querySelector('[data-admin-form]');
      if (adminForm) adminForm.hidden = false;
      return;
    }
    if (action === 'admin-cancel-book') {
      var cancelForm = document.querySelector('[data-admin-form]');
      if (cancelForm) cancelForm.hidden = true;
      return;
    }
    if (action === 'admin-save-book') {
      var saveForm = document.querySelector('[data-admin-form]');
      if (saveForm) saveForm.hidden = true;
      updateText('[data-admin-status]', '已保存书籍信息（静态演示，未写入后端）。');
      showToast('书籍信息已在当前页面模拟保存。');
      return;
    }
    if (action === 'tool-checkin') {
      updateText('[data-tool-status]', '已完成一次本地打卡（静态演示，未写入后端）。');
      showToast('打卡状态已更新。');
      return;
    }
    if (action === 'tool-save-note') {
      updateText('[data-tool-note-status]', '笔记已保存到当前页面（静态演示）。');
      showToast('笔记已保存。');
      return;
    }
    if (action === 'tool-delete-note') {
      var note = target.closest('.tool-list-item');
      if (note) note.remove();
      showToast('笔记已从当前页面移除。');
      return;
    }
    if (action === 'tool-start-reading') {
      updateText('[data-tool-status]', '已开始新的阅读计划（静态演示）。');
      showToast('阅读计划已开始。');
      return;
    }
    if (action === 'tool-complete-plan') {
      target.textContent = '已完成';
      target.disabled = true;
      updateText('[data-tool-status]', '阅读计划已完成（静态演示）。');
      showToast('计划完成状态已更新。');
      return;
    }
    if (action === 'tool-cancel-reservation') {
      target.textContent = '已取消';
      target.disabled = true;
      showToast('预约已取消（静态演示）。');
      return;
    }
    if (action === 'tool-create-group') {
      updateText('[data-tool-status]', '已创建阅读小组（静态演示，未写入后端）。');
      showToast('小组创建状态已更新。');
      return;
    }
    if (action === 'tool-join-group') {
      updateText('[data-tool-status]', '已加入示例阅读班（静态演示）。');
      showToast('已加入示例阅读班。');
      return;
    }
    if (action === 'tool-toggle-members') {
      var members = target.closest('.tool-group')?.querySelector('[data-tool-members]');
      if (members) members.hidden = !members.hidden;
      return;
    }
    if (action === 'tool-open-task') {
      openProfileTool('tasks');
      return;
    }
    if (action === 'tool-open-ranking') {
      openProfileTool('ranking');
      return;
    }
    if (action === 'tool-publish-task') {
      updateText('[data-tool-status]', '任务已发布（静态演示，未写入后端）。');
      showToast('阅读任务已发布。');
      return;
    }
    if (action === 'tool-submit-task') {
      target.textContent = '已提交';
      target.disabled = true;
      updateText('[data-tool-status]', '学生回答已提交（静态演示）。');
      showToast('任务回答已提交。');
      return;
    }
    if (action === 'tool-review-confirm') {
      updateText('[data-tool-status]', '教师已确认完成，已生成行为记录（静态演示）。');
      showToast('已确认完成。');
      return;
    }
    if (action === 'tool-review-return') {
      updateText('[data-tool-status]', '已退回修改，等待学生重新提交（静态演示）。');
      showToast('已退回修改。');
      return;
    }
    if (action === 'tool-refresh-ranking') {
      updateText('[data-tool-status]', '排行已刷新（静态演示数据没有变化）。');
      showToast('排行榜已刷新。');
      return;
    }
    if (action === 'open-ai' || action === 'ask-ai') {
      showChat(action === 'ask-ai' ? '已准备图片提问流程（当前不会上传文件）' : '已打开示例伴读会话');
      showToast(action === 'ask-ai' ? '请在下方选择图片并补充问题，静态演示不会调用 AI。' : '已进入伴读会话，真实版本会在这里加载历史消息。');
      return;
    }
    if (action === 'apply-filter') {
      filterBooks();
      showToast('已应用书名 / 作者筛选。');
      return;
    }
    if (action === 'new-ai') {
      resetChatForm();
      var chatList = document.querySelector('[data-chat-messages]');
      if (chatList) chatList.innerHTML = '';
      showChat('新建伴读：先填写书籍信息，再输入问题。');
      showToast('已打开新建伴读页面。');
      return;
    }
    if (action === 'open-session') {
      showChat('已加载示例会话历史，可以继续提问。');
      var sessionMessages = document.querySelector('[data-chat-messages]');
      if (sessionMessages) {
        sessionMessages.innerHTML = '';
        appendChatMessage('user', '这本书的核心观点是什么？');
        appendChatMessage('assistant', '这是静态演示回复：我会基于当前书籍元数据和你提供的上下文展开讨论。');
      }
      return;
    }
    if (action === 'back-ai') {
      setView('ai-sessions', 'AI伴读');
      document.querySelectorAll('[data-tab-button]').forEach(function (button) {
        button.classList.toggle('active', button.getAttribute('data-tab-button') === '伴读');
      });
      showToast('已返回伴读会话列表。');
      return;
    }
    if (action === 'send-ai') {
      var question = document.querySelector('[data-chat-question]');
      var context = document.querySelector('[data-chat-context]');
      var text = question ? question.value.trim() : '';
      var imageName = document.querySelector('[data-image-name]')?.textContent || '';
      if (!text && imageName === '未选择图片') {
        showToast('请输入问题或先选择图片。');
        return;
      }
      appendChatMessage('user', text || '请解释我上传的图片内容。');
      appendChatMessage('assistant', '这是静态演示回复：我会结合书名、作者、版本、上下文和图片内容回答。');
      if (question) question.value = '';
      if (context) context.value = '';
      updateText('[data-chat-status]', '已完成一轮本地模拟对话，未发送到网络。');
      showToast('已添加一轮本地模拟对话。');
      return;
    }
    if (action === 'remove-image') {
      resetChatForm();
      return;
    }
    if (action === 'add-plan') {
      updateText('[data-plan-status]', '已加入本地阅读计划');
      target.textContent = '已加入计划';
      target.disabled = true;
      showToast('阅读计划状态已在当前页面更新。');
      return;
    }
    if (action === 'view-task') {
      updateText('[data-task-status]', '已打开“人物讨论”任务');
      showToast('真实版本会进入任务详情并显示提交、反馈状态。');
      return;
    }
    if (action === 'submit-answer') {
      updateText('[data-submission-status]', '已提交（静态演示）');
      target.textContent = '已提交';
      target.disabled = true;
      showToast('学生回答已在页面内模拟提交。');
      return;
    }
    if (action === 'join-group') {
      updateText('[data-group-status]', '已加入示例阅读班（静态演示）');
      showToast('邀请码校验和成员写入只在真实版本发生。');
      return;
    }
    if (action === 'confirm-task') {
      updateText('[data-review-status]', '教师已确认完成，已生成行为记录（静态演示）');
      target.textContent = '已确认完成';
      target.disabled = true;
      showToast('确认动作只修改当前页面演示状态。');
      return;
    }
    if (action === 'return-task') {
      updateText('[data-review-status]', '已退回修改，等待学生重新提交（静态演示）');
      showToast('退回动作只修改当前页面演示状态。');
      return;
    }
    if (action === 'publish-task') {
      updateText('[data-publish-status]', '任务已发布（静态演示）');
      showToast('真实版本会保存到教师负责的班级或小组。');
      return;
    }
    if (action === 'create-group') {
      updateText('[data-create-group-status]', '已创建“新阅读小组”（静态演示）');
      showToast('真实版本会执行权限校验并生成邀请码。');
      return;
    }
    if (action === 'view-members') {
      var memberPanel = document.querySelector('[data-members]');
      if (memberPanel) memberPanel.hidden = !memberPanel.hidden;
      return;
    }
    if (action === 'simulate-import') {
      updateText('[data-import-status]', '本次模拟导入 20 条元数据，未写入任何后端');
      updateText('[data-import-count]', '100');
      showToast('只模拟导入结果，数据来自页面内固定样例。');
      return;
    }
    if (action === 'show-fields') {
      var fields = document.querySelector('[data-fields]');
      if (fields) fields.hidden = !fields.hidden;
      return;
    }
    if (action === 'refresh-catalog') {
      showToast('目录已刷新（静态演示数据没有变化）。');
    }
  });

  document.addEventListener('input', function (event) {
    if (event.target.matches('[data-book-search]')) filterBooks();
  });

  document.addEventListener('change', function (event) {
    var input = event.target.closest('[data-demo-file]');
    if (input && input.files && input.files[0]) {
      var fileName = input.files[0].name;
      var output = document.querySelector(input.getAttribute('data-demo-file'));
      if (output) output.textContent = '已选择：' + fileName + '（仅本地演示）';
      var preview = document.querySelector('[data-image-preview]');
      if (preview) preview.hidden = false;
      showToast('图片已选择，静态演示不会上传文件。');
      return;
    }
    if (event.target.matches('[data-book-field]')) filterBooks();
    if (event.target.matches('[data-book-sort]')) sortBooks();
  });

  document.addEventListener('DOMContentLoaded', function () {
    filterBooks();
    sortBooks();
  });
})();
