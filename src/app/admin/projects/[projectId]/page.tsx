import ProjectViewsClient from '@/components/admin/project-views-client';

export default function ProjectViewsPage({ params: { projectId } }: { params: { projectId: string } }) {
    const projectName = projectId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    return <ProjectViewsClient projectName={projectName} />;
}
