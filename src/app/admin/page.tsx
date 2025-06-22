import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function AdminProjectsPage() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <Link href="/admin/projects/porto-montenegro">
                <Card className="bg-[#2a2a2a] border-neutral-700 text-white rounded-lg h-full cursor-pointer hover:border-yellow-500 transition-colors flex flex-col justify-between min-h-[240px]">
                    <div>
                        <CardHeader>
                            <CardTitle className="text-lg font-medium">Porto Montenegro</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <p className="text-sm text-neutral-400">
                                description placeholder
                            </p>
                        </CardContent>
                    </div>
                </Card>
            </Link>

            <Card className="bg-[#2a2a2a] border-neutral-700 text-white flex flex-col items-center justify-center min-h-[240px] rounded-lg">
                <CardHeader className="items-center text-center p-4">
                    <CardTitle className="text-lg font-medium">New Project</CardTitle>
                    <CardDescription className="text-neutral-400 pt-2 text-sm">
                        Create or import a new project
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" size="icon" className="h-14 w-14 rounded-full bg-transparent border-neutral-600 hover:bg-neutral-700 hover:border-neutral-500">
                        <Plus className="h-7 w-7 text-neutral-400" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
