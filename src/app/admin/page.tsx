import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function AdminProjectsPage() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <Card className="bg-[#2a2a2a] border-neutral-700 text-white rounded-lg">
                <CardHeader>
                    <CardTitle className="text-lg font-medium">Porto Montenegro</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 pb-10">
                    <p className="text-sm text-neutral-400">
                        description placeholder
                    </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-4">
                    <Button variant="ghost" className="text-neutral-400 hover:text-white p-0 h-auto text-xs font-semibold tracking-wider">EXPORT</Button>
                    <Button variant="ghost" className="text-yellow-500 hover:text-yellow-400 p-0 h-auto text-xs font-semibold tracking-wider">EXPLORE</Button>
                </CardFooter>
            </Card>

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
