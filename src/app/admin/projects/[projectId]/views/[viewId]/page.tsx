import ViewEditorClient from '@/components/admin/view-editor-client';

export default function ViewEditorPage({ params }: { params: { projectId: string; viewId: string } }) {
  const { projectId, viewId } = params;

  return <ViewEditorClient projectId={projectId} viewId={viewId} />;
}
