import { Button, Input, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { addNote, checkIn, checkInStat, deleteNote, listNote } from '../../services/noteService'
import { isSuccess, showErrorToast } from '../../services/request'
import { useNoteStore } from '../../store/noteStore'
import NoteItem from '../../components/NoteItem'
import StateView from '../../components/StateView'
import './index.scss'

export default function Notes() {
  const { notes, stat, loading, setNotes, setStat, setLoading } = useNoteStore()
  const [bookId, setBookId] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [checkinMinutes, setCheckinMinutes] = useState('30')

  const loadNotes = useCallback(async () => {
    setLoading(true)
    const res = await listNote({ page: 1, pageSize: 50 })
    if (isSuccess(res) && res.data) setNotes(res.data.list, res.data.total, 1)
    else if (!isSuccess(res)) showErrorToast(res.code)
    setLoading(false)
  }, [setNotes, setLoading])

  const loadStat = useCallback(async () => {
    const res = await checkInStat()
    if (isSuccess(res) && res.data) setStat(res.data)
  }, [setStat])

  useEffect(() => {
    setBookId(Taro.getCurrentInstance().router?.params?.bookId ?? '')
    loadNotes()
    loadStat()
  }, [loadNotes, loadStat])

  async function handleAddNote() {
    if (!bookId.trim() || !noteContent.trim()) {
      Taro.showToast({ title: '请填写书籍 ID 和笔记内容', icon: 'none' })
      return
    }
    const res = await addNote({ bookId: bookId.trim(), content: noteContent.trim() })
    if (isSuccess(res)) {
      setNoteContent('')
      loadNotes()
    } else showErrorToast(res.code)
  }

  async function handleDeleteNote(noteId: string) {
    const res = await deleteNote(noteId)
    if (isSuccess(res)) loadNotes()
    else showErrorToast(res.code)
  }

  async function handleCheckIn() {
    const minutes = Number(checkinMinutes)
    if (!bookId.trim() || !Number.isFinite(minutes) || minutes <= 0) {
      Taro.showToast({ title: '请输入书籍 ID 和有效的阅读分钟数', icon: 'none' })
      return
    }
    const res = await checkIn({ bookId: bookId.trim(), minutes })
    if (isSuccess(res)) loadStat()
    else showErrorToast(res.code)
  }

  return (
    <View className='notes'>
      <View className='notes__stat'>
        <View className='notes__stat-item'><Text className='notes__stat-number'>{stat.streakDays}</Text><Text>连续打卡天数</Text></View>
        <View className='notes__stat-item'><Text className='notes__stat-number'>{stat.totalMinutes}</Text><Text>累计阅读分钟</Text></View>
      </View>

      <View className='notes__book'>
        <Text className='notes__label'>当前书籍</Text>
        <Input className='notes__book-input' placeholder='请输入书籍 ID（可从书籍详情页进入）' value={bookId} onInput={(event) => setBookId(event.detail.value)} />
      </View>

      <View className='notes__checkin'>
        <Input className='notes__checkin-input' type='number' placeholder='阅读分钟数' value={checkinMinutes} onInput={(event) => setCheckinMinutes(event.detail.value)} />
        <Button className='notes__checkin-btn' onClick={handleCheckIn}>完成打卡</Button>
      </View>

      <View className='notes__add'>
        <Textarea className='notes__add-textarea' placeholder='写下阅读笔记' value={noteContent} onInput={(event) => setNoteContent(event.detail.value)} />
        <Button onClick={handleAddNote}>保存笔记</Button>
      </View>

      <StateView loading={loading} empty={notes.length === 0} emptyText='还没有笔记' />
      {notes.map((note) => <NoteItem key={note.noteId} note={note} onDelete={handleDeleteNote} />)}
    </View>
  )
}
