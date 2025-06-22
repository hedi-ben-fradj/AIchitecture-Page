'use client';

import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProjectPage({ params }: { params: { projectId: string } }) {
    const projectName = params.projectId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    return (
        <div className="flex flex-col h-full bg-[#313131]">
            <header className="h-16 flex-shrink-0 flex items-center px-6 border-b border-neutral-700 bg-[#3c3c3c]">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold text-white">{projectName}</h1>
                </div>
                <div className="ml-auto">
                    <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                        <Star className="h-5 w-5" />
                    </Button>
                </div>
            </header>
            <div className="flex-1 p-8">
                 <Tabs defaultValue="details" className="w-full">
                    <TabsList className="bg-transparent border-b border-neutral-600 rounded-none p-0 h-auto w-full justify-start">
                        <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none text-neutral-400 px-4 py-3 text-sm font-medium hover:text-white">DETAILS</TabsTrigger>
                        <TabsTrigger value="media" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none text-neutral-400 px-4 py-3 text-sm font-medium hover:text-white">MEDIA</TabsTrigger>
                        <TabsTrigger value="masterplans" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none text-neutral-400 px-4 py-3 text-sm font-medium hover:text-white">MASTERPLANS</TabsTrigger>
                        <TabsTrigger value="reservations" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none text-neutral-400 px-4 py-3 text-sm font-medium hover:text-white">RESERVATIONS</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="mt-6">
                        <div className="max-w-md space-y-6">
                            <div>
                                <Label htmlFor="name" className="text-xs text-neutral-400 px-1">Name</Label>
                                <Input id="name" defaultValue={projectName} className="bg-[#2a2a2a] border-neutral-600 text-white mt-1"/>
                            </div>
                            <Button className="bg-neutral-600 hover:bg-neutral-500 text-white font-semibold px-6">SAVE</Button>
                        </div>
                    </TabsContent>
                    <TabsContent value="media"><p className="text-neutral-400">Media content goes here.</p></TabsContent>
                    <TabsContent value="masterplans"><p className="text-neutral-400">Masterplans content goes here.</p></TabsContent>
                    <TabsContent value="reservations"><p className="text-neutral-400">Reservations content goes here.</p></TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
