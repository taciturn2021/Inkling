"use client";

import { useParams } from 'next/navigation';
import NoteEditor from '@/components/NoteEditor';

export default function EditNotePage() {
  const { id } = useParams<{ id: string }>();
  return <NoteEditor noteId={id} />;
}
