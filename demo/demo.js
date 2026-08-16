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
    if (backButton) backButton.disabled = viewName !== 'ai-chat';
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

  document.addEventListener('click', function (event) {
    var tab = event.target.closest('[data-tab-button]');
    if (tab) {
      switchTab(tab.getAttribute('data-tab-button'));
      return;
    }

    var target = event.target.closest('[data-demo-action]');
    if (!target) return;

    var action = target.getAttribute('data-demo-action');
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
