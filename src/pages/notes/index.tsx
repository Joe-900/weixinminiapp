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
      Taro.showToast({ title: 'Book id and note are required', icon: 'none' })
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
      Taro.showToast({ title: 'Enter a book id and valid minutes', icon: 'none' })
      return
    }
    const res = await checkIn({ bookId: bookId.trim(), minutes })
    if (isSuccess(res)) loadStat()
    else showErrorToast(res.code)
  }

  return (
    <View className='notes'>
      <View className='notes__stat'>
        <View className='notes__stat-item'><Text className='notes__stat-number'>{stat.streakDays}</Text><Text>day streak</Text></View>
        <View className='notes__stat-item'><Text className='notes__stat-number'>{stat.totalMinutes}</Text><Text>minutes read</Text></View>
      </View>

      <View className='notes__book'>
        <Text className='notes__label'>Book id</Text>
        <Input className='notes__book-input' placeholder='Use the id from a book detail page' value={bookId} onInput={(event) => setBookId(event.detail.value)} />
      </View>

      <View className='notes__checkin'>
        <Input className='notes__checkin-input' type='number' placeholder='Minutes' value={checkinMinutes} onInput={(event) => setCheckinMinutes(event.detail.value)} />
        <Button className='notes__checkin-btn' onClick={handleCheckIn}>Check in</Button>
      </View>

      <View className='notes__add'>
        <Textarea className='notes__add-textarea' placeholder='Write a reading note' value={noteContent} onInput={(event) => setNoteContent(event.detail.value)} />
        <Button onClick={handleAddNote}>Add note</Button>
      </View>

      <StateView loading={loading} empty={notes.length === 0} emptyText='No notes yet' />
      {notes.map((note) => <NoteItem key={note.noteId} note={note} onDelete={handleDeleteNote} />)}
    </View>
  )
}
