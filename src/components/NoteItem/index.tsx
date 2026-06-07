/**
 * @file 笔记条目组件
 * @description 展示单条笔记内容
 */

import { View, Text } from '@tarojs/components'
import type { Note } from '../../types/note'
import './index.scss'

interface NoteItemProps {
  note: Note
  onDelete?: (noteId: string) => void
}

export default function NoteItem({ note, onDelete }: NoteItemProps) {
  return (
    <View className='note-item'>
      <View className='note-item__content'>
        <Text className='note-item__text'>{note.content}</Text>
        <Text className='note-item__date'>{new Date(note.createdAt).toLocaleDateString()}</Text>
      </View>
      {onDelete && (
        <View className='note-item__delete' onClick={() => onDelete(note.noteId)}>
          <Text>删除</Text>
        </View>
      )}
    </View>
  )
}
