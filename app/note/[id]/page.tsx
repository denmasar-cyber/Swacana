import NoteWorkspace from '@/components/features/note-workspace';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NotePage({ params }: Props) {
  const { id } = await params;
  return <NoteWorkspace noteId={id} />;
}
