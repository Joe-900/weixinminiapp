import { Button, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import {
  createTask,
  getTaskDetail,
  listTaskSubmissions,
  listTasks,
  sendTaskFeedback,
  submitTask,
} from '../../services/taskService'
import { listCommunityGroups } from '../../services/communityService'
import { isSuccess, showErrorToast } from '../../services/request'
import { useUserStore } from '../../store/userStore'
import type { ClassGroup } from '../../types/community'
import type { ReadingTask, TaskDetail, TaskSubmission } from '../../types/task'
import StateView from '../../components/StateView'
import './index.scss'

function taskStatusLabel(status: ReadingTask['status']): string {
  return status === 'published' ? '进行中' : '已结束'
}

function formatDueAt(timestamp?: number): string {
  return timestamp ? `截止：${new Date(timestamp).toLocaleDateString('zh-CN')}` : '暂无截止时间'
}

export default function Tasks() {
  const role = useUserStore((state) => state.role)
  const isReviewer = role === 'teacher' || role === 'admin'
  const [groups, setGroups] = useState<ClassGroup[]>([])
  const [groupId, setGroupId] = useState('')
  const [tasks, setTasks] = useState<ReadingTask[]>([])
  const [selected, setSelected] = useState<TaskDetail | null>(null)
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [text, setText] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createBookId, setCreateBookId] = useState('')
  const [feedback, setFeedback] = useState('')
  const [score, setScore] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (preferredGroupId?: string) => {
    setLoading(true)
    const [groupsRes, tasksRes] = await Promise.all([listCommunityGroups(), listTasks()])
    if (isSuccess(groupsRes) && groupsRes.data) {
      setGroups(groupsRes.data)
      setGroupId((current) => {
        if (preferredGroupId && groupsRes.data!.some((group) => group.groupId === preferredGroupId)) return preferredGroupId
        if (current && groupsRes.data!.some((group) => group.groupId === current)) return current
        return groupsRes.data![0]?.groupId ?? ''
      })
    } else if (!isSuccess(groupsRes)) showErrorToast(groupsRes.code)
    if (isSuccess(tasksRes) && tasksRes.data) setTasks(tasksRes.data)
    else if (!isSuccess(tasksRes)) showErrorToast(tasksRes.code)
    setLoading(false)
  }, [])

  useEffect(() => {
    const routeGroupId = Taro.getCurrentInstance().router?.params?.groupId ?? ''
    load(routeGroupId)
  }, [load])

  const visibleTasks = groupId ? tasks.filter((task) => task.groupId === groupId) : tasks
  const selectedGroupIndex = Math.max(0, groups.findIndex((group) => group.groupId === groupId))
  const selectedGroup = groups.find((group) => group.groupId === groupId)

  async function selectTask(task: ReadingTask) {
    const res = await getTaskDetail(task.taskId)
    if (isSuccess(res) && res.data) {
      setSelected(res.data)
      setText(res.data.submission?.text ?? '')
      if (isReviewer) {
        const submissionsRes = await listTaskSubmissions(task.taskId)
        if (isSuccess(submissionsRes) && submissionsRes.data) setSubmissions(submissionsRes.data)
      }
    } else showErrorToast(res.code)
  }

  async function create() {
    if (!groupId || !createTitle.trim() || !createDescription.trim()) {
      Taro.showToast({ title: '请选择分组并填写任务内容', icon: 'none' })
      return
    }
    const res = await createTask({
      groupId,
      bookId: createBookId.trim() || undefined,
      title: createTitle.trim(),
      description: createDescription.trim(),
    })
    if (isSuccess(res)) {
      setCreateTitle('')
      setCreateDescription('')
      setCreateBookId('')
      load(groupId)
    } else showErrorToast(res.code)
  }

  async function submit() {
    if (!selected) return
    const res = await submitTask({ taskId: selected.task.taskId, text })
    if (isSuccess(res)) selectTask(selected.task)
    else showErrorToast(res.code)
  }

  async function review(submissionId: string, confirmed: boolean) {
    if (!feedback.trim()) {
      Taro.showToast({ title: '请先填写教师反馈', icon: 'none' })
      return
    }
    const res = await sendTaskFeedback({
      submissionId,
      comment: feedback.trim(),
      score: score ? Number(score) : undefined,
      confirmed,
    })
    if (isSuccess(res) && selected) {
      setFeedback('')
      setScore('')
      selectTask(selected.task)
    } else if (!isSuccess(res)) showErrorToast(res.code)
  }

  return (
    <View className='tasks-page'>
      <View className='tasks-page__group-form'>
        <Text className='tasks-page__group-label'>当前分组</Text>
        {groups.length > 0 ? (
          <Picker
            mode='selector'
            range={groups.map((group) => group.name)}
            value={selectedGroupIndex}
            onChange={(event) => {
              const nextGroup = groups[Number(event.detail.value)]
              setGroupId(nextGroup?.groupId ?? '')
              setSelected(null)
            }}
          >
            <View className='tasks-page__group-picker'>{selectedGroup?.name ?? '请选择分组'}</View>
          </Picker>
        ) : (
          <Text className='tasks-page__group-empty'>暂无可用分组，请先加入班级或小组</Text>
        )}
      </View>

      {isReviewer && groupId && (
        <View className='tasks-page__card'>
          <Text className='tasks-page__heading'>发布阅读任务</Text>
          <Input value={createTitle} placeholder='任务标题' onInput={(event) => setCreateTitle(event.detail.value)} />
          <Input value={createBookId} placeholder='关联书籍 ID（可选）' onInput={(event) => setCreateBookId(event.detail.value)} />
          <Textarea value={createDescription} placeholder='任务要求和提交说明' onInput={(event) => setCreateDescription(event.detail.value)} />
          <Button onClick={create}>发布任务</Button>
        </View>
      )}

      <StateView loading={loading} empty={visibleTasks.length === 0} emptyText='当前分组还没有已发布任务' />
      <View className='tasks-page__list'>
        {visibleTasks.map((task) => (
          <View className='tasks-page__task' key={task.taskId} onClick={() => selectTask(task)}>
            <View className='tasks-page__task-main'>
              <Text className='tasks-page__task-title'>{task.title}</Text>
              <Text className='tasks-page__task-meta'>{taskStatusLabel(task.status)} · {formatDueAt(task.dueAt)}</Text>
            </View>
            <Text className='tasks-page__task-arrow'>查看</Text>
          </View>
        ))}
      </View>

      {selected && (
        <View className='tasks-page__card tasks-page__detail'>
          <Text className='tasks-page__heading'>{selected.task.title}</Text>
          <Text className='tasks-page__description'>{selected.task.description}</Text>
          {!isReviewer && (
            <View className='tasks-page__student-form'>
              <Text className='tasks-page__section-label'>我的提交</Text>
              <Textarea value={text} placeholder='写下你的阅读回答或问题' onInput={(event) => setText(event.detail.value)} />
              <Button onClick={submit}>{selected.submission ? '重新提交' : '提交回答'}</Button>
            </View>
          )}
          {selected.feedback.length > 0 ? (
            <View className='tasks-page__feedback-list'>
              <Text className='tasks-page__section-label'>教师反馈</Text>
              {selected.feedback.map((item) => (
                <Text className='tasks-page__feedback' key={item.feedbackId}>
                  {item.comment}{item.score === undefined ? '' : `（评分 ${item.score}）`} · {item.confirmed ? '已确认完成' : '请修改后再提交'}
                </Text>
              ))}
            </View>
          ) : !isReviewer ? <Text className='tasks-page__muted'>暂时还没有教师反馈</Text> : null}
          {isReviewer && (
            <View className='tasks-page__review-list'>
              <Text className='tasks-page__section-label'>学生提交（{submissions.length}）</Text>
              {submissions.length === 0 && <Text className='tasks-page__muted'>还没有学生提交</Text>}
              {submissions.map((submission) => (
                <View className='tasks-page__submission' key={submission.submissionId}>
                  <Text className='tasks-page__submission-text'>{submission.openid}：{submission.text || '提交了图片或问题'}</Text>
                  <Input value={feedback} placeholder='教师反馈' onInput={(event) => setFeedback(event.detail.value)} />
                  <Input value={score} type='number' placeholder='评分 0-100（可选）' onInput={(event) => setScore(event.detail.value)} />
                  <View className='tasks-page__review-buttons'>
                    <Button size='mini' onClick={() => review(submission.submissionId, true)}>确认完成</Button>
                    <Button size='mini' onClick={() => review(submission.submissionId, false)}>退回修改</Button>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}
