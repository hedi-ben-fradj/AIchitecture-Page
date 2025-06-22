'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useViews } from '@/contexts/views-context';

export default function ProjectViewsPage({ params }: { params: { projectId: string } }) {
    const projectName = params.projectId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const { views } = useViews();

    return (
        <div className="flex flex-col h-full bg-[#313131]">
             <header className="h-16 flex-shrink-0 flex items-center px-6 border-b border-neutral-700 bg-[#3c3c3c]">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold text-white">{projectName} / Select a view to edit</h1>
                </div>
            </header>
            <div className="flex-1 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {views.map((view) => (
                        <Link key={view.id} href={view.href}>
                            <Card className="bg-[#2a2a2a] border-neutral-700 text-white rounded-lg h-full cursor-pointer hover:border-yellow-500 transition-colors">
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <view.icon className="h-8 w-8 text-yellow-500" />
                                    <CardTitle className="text-lg font-medium">{view.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-neutral-400">
                                        Upload an image and define selectable areas for the {view.name.toLowerCase()}.
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
