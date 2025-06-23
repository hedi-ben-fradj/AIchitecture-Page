import ViewEditorClient from '@/components/admin/view-editor-client';

export default function ViewEditorPage({ params }: { params: { projectId: string; entityId: string; viewId: string } }) {
  const { projectId, entityId, viewId } = params;

  return <ViewEditorClient projectId={projectId} entityId={entityId} viewId={viewId} />;
}
