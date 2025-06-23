import EntityViewsClient from '@/components/admin/entity-views-client';

export default function EntityViewsPage({ params }: { params: { projectId: string, entityId: string } }) {
    const { projectId, entityId } = params;
    
    return <EntityViewsClient projectId={projectId} entityId={entityId} />;
}
