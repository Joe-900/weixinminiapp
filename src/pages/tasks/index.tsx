import { Button, Input, Text, Textarea, View } from '@tarojs/components'
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
import { isSuccess, showErrorToast } from '../../services/request'
import { useUserStore } from '../../store/userStore'
import type { ReadingTask, TaskDetail, TaskSubmission } from '../../types/task'
import StateView from '../../components/StateView'
import './index.scss'

export default function Tasks() {
  const role = useUserStore((state) => state.role)
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

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listTasks()
    if (isSuccess(res) && res.data) setTasks(res.data)
    else if (!isSuccess(res)) showErrorToast(res.code)
    setLoading(false)
  }, [])

  useEffect(() => {
    setGroupId(Taro.getCurrentInstance().router?.params?.groupId ?? '')
    load()
  }, [load])

  async function selectTask(task: ReadingTask) {
    const res = await getTaskDetail(task.taskId)
    if (isSuccess(res) && res.data) {
      setSelected(res.data)
      setText(res.data.submission?.text ?? '')
      if (role === 'teacher' || role === 'admin') {
        const submissionsRes = await listTaskSubmissions(task.taskId)
        if (isSuccess(submissionsRes) && submissionsRes.data) setSubmissions(submissionsRes.data)
      }
    } else showErrorToast(res.code)
  }

  async function create() {
    if (!groupId.trim() || !createTitle.trim() || !createDescription.trim()) return
    const res = await createTask({
      groupId: groupId.trim(),
      bookId: createBookId.trim() || undefined,
      title: createTitle.trim(),
      description: createDescription.trim(),
    })
    if (isSuccess(res)) { setCreateTitle(''); setCreateDescription(''); load() } else showErrorToast(res.code)
  }

  async function submit() {
    if (!selected) return
    const res = await submitTask({ taskId: selected.task.taskId, text })
    if (isSuccess(res)) selectTask(selected.task)
    else showErrorToast(res.code)
  }

  async function review(submissionId: string, confirmed: boolean) {
    const res = await sendTaskFeedback({
      submissionId,
      comment: feedback.trim(),
      score: score ? Number(score) : undefined,
      confirmed,
    })
    if (isSuccess(res) && selected) selectTask(selected.task)
    else if (!isSuccess(res)) showErrorToast(res.code)
  }

  return (
    <View className='tasks-page'>
      <View className='tasks-page__group-form'>
        <Text>Group id</Text>
        <Input value={groupId} placeholder='From the group page' onInput={(event) => setGroupId(event.detail.value)} />
      </View>
      {(role === 'teacher' || role === 'admin') && (
        <View className='tasks-page__card'>
          <Text className='tasks-page__heading'>Publish task</Text>
          <Input value={createTitle} placeholder='Task title' onInput={(event) => setCreateTitle(event.detail.value)} />
          <Input value={createBookId} placeholder='Book id (optional)' onInput={(event) => setCreateBookId(event.detail.value)} />
          <Textarea value={createDescription} placeholder='Requirements' onInput={(event) => setCreateDescription(event.detail.value)} />
          <Button onClick={create}>Publish</Button>
        </View>
      )}
      <StateView loading={loading} empty={tasks.length === 0} emptyText='No published tasks' />
      <View className='tasks-page__list'>
        {tasks.map((task) => <View className='tasks-page__task' key={task.taskId} onClick={() => selectTask(task)}><Text>{task.title}</Text><Text>{task.status}</Text></View>)}
      </View>
      {selected && (
        <View className='tasks-page__card tasks-page__detail'>
          <Text className='tasks-page__heading'>{selected.task.title}</Text>
          <Text className='tasks-page__description'>{selected.task.description}</Text>
          <Textarea value={text} placeholder='Your response' onInput={(event) => setText(event.detail.value)} />
          <Button onClick={submit}>Submit / resubmit</Button>
          {selected.feedback.map((item) => <Text className='tasks-page__feedback' key={item.feedbackId}>Feedback: {item.comment}{item.score === undefined ? '' : ` (${item.score})`}</Text>)}
          {(role === 'teacher' || role === 'admin') && submissions.map((submission) => (
            <View className='tasks-page__submission' key={submission.submissionId}>
              <Text>{submission.openid}: {submission.text || '[image/question]'}</Text>
              <Input value={feedback} placeholder='Feedback' onInput={(event) => setFeedback(event.detail.value)} />
              <Input value={score} type='number' placeholder='Score 0-100' onInput={(event) => setScore(event.detail.value)} />
              <View className='tasks-page__review-buttons'><Button size='mini' onClick={() => review(submission.submissionId, true)}>Confirm</Button><Button size='mini' onClick={() => review(submission.submissionId, false)}>Return</Button></View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
