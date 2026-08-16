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

  function switchTab(target) {
    var buttons = document.querySelectorAll('[data-tab-button]');
    buttons.forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-tab-button') === target);
    });
    updateText('[data-tab-status]', '当前页面：' + target);
    showToast('已切换到“' + target + '”页面（静态演示）。');
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
    if (action === 'open-ai') {
      updateText('[data-ai-status]', '已打开《共产党宣言》的伴读会话（仅前端演示）');
      showToast('已进入伴读会话，真实版本会在这里加载历史消息。');
      return;
    }
    if (action === 'ask-ai') {
      updateText('[data-ai-status]', '已准备图片提问流程（当前不会上传文件）');
      showToast('这是图片提问按钮，静态演示不会调用 AI 接口。');
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

  document.addEventListener('change', function (event) {
    var input = event.target.closest('[data-demo-file]');
    if (!input || !input.files || !input.files[0]) return;
    var fileName = input.files[0].name;
    var output = document.querySelector(input.getAttribute('data-demo-file'));
    if (output) output.textContent = '已选择：' + fileName + '（仅本地演示）';
    showToast('图片已选择，静态演示不会上传文件。');
  });
})();
