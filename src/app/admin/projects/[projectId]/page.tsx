import ProjectEntitiesClient from '@/components/admin/project-views-client';

export default function ProjectEntitiesPage({ params: { projectId } }: { params: { projectId: string } }) {
    const projectName = projectId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    return <ProjectEntitiesClient projectName={projectName} projectId={projectId} />;
}
