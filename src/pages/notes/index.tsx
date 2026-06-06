/**
 * @file Notes page - My notes and checkin
 * @description Display user notes, add/delete notes, checkin and stats
 */

import { View, Text, Textarea, Button, Input } from '@tarojs/components'
import { useState, useEffect, useCallback } from 'react'
import { addNote, listNote, deleteNote, checkIn, checkInStat } from '../../services/noteService'
import { isSuccess, showErrorToast } from '../../services/request'
import { useNoteStore } from '../../store/noteStore'
import NoteItem from '../../components/NoteItem'
import StateView from '../../components/StateView'
import './index.scss'

export default function Notes() {
  const { notes, stat, loading, setNotes, setStat, setLoading } = useNoteStore()
  const [noteContent, setNoteContent] = useState('')
  const [checkinMinutes, setCheckinMinutes] = useState('30')

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listNote({ page: 1, pageSize: 50 })
      if (isSuccess(res) && res.data) {
        setNotes(res.data.list, res.data.total, 1)
      }
    } finally {
      setLoading(false)
    }
  }, [setNotes, setLoading])

  const loadStat = useCallback(async () => {
    const res = await checkInStat()
    if (isSuccess(res) && res.data) {
      setStat(res.data)
    }
  }, [setStat])

  useEffect(() => {
    loadNotes()
    loadStat()
  }, [loadNotes, loadStat])

  async function handleAddNote() {
    if (!noteContent.trim()) return
    const res = await addNote({ bookId: 'book_001', content: noteContent.trim() })
    if (isSuccess(res)) {
      setNoteContent('')
      loadNotes()
    } else {
      showErrorToast(res.code)
    }
  }

  async function handleDeleteNote(noteId: string) {
    const res = await deleteNote(noteId)
    if (isSuccess(res)) {
      loadNotes()
    } else {
      showErrorToast(res.code)
    }
  }

  async function handleCheckIn() {
    const minutes = parseInt(checkinMinutes, 10)
    if (!minutes || minutes <= 0) return
    const res = await checkIn({ bookId: 'book_001', minutes })
    if (isSuccess(res)) {
      loadStat()
    } else {
      showErrorToast(res.code)
    }
  }

  return (
    <View className='notes'>
      <View className='notes__stat'>
        <View className='notes__stat-item'>
          <Text className='notes__stat-number'>{stat.streakDays}</Text>
          <Text className='notes__stat-label'>Streak Days</Text>
        </View>
        <View className='notes__stat-item'>
          <Text className='notes__stat-number'>{stat.totalMinutes}</Text>
          <Text className='notes__stat-label'>Total Minutes</Text>
        </View>
      </View>

      <View className='notes__checkin'>
        <Input
          className='notes__checkin-input'
          type='number'
          placeholder='Minutes'
          value={checkinMinutes}
          onInput={(e) => setCheckinMinutes(e.detail.value)}
        />
        <Button className='notes__checkin-btn' onClick={handleCheckIn}>Check In</Button>
      </View>

      <View className='notes__add'>
        <Textarea
          className='notes__add-textarea'
          placeholder='Write a note...'
          value={noteContent}
          onInput={(e) => setNoteContent(e.detail.value)}
        />
        <Button onClick={handleAddNote}>Add Note</Button>
      </View>

      <StateView loading={loading} empty={notes.length === 0} emptyText='No notes yet' />

      {notes.map((note) => (
        <NoteItem key={note.noteId} note={note} onDelete={handleDeleteNote} />
      ))}
    </View>
  )
}
