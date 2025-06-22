'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Check } from 'lucide-react';
import { useViews, type View } from '@/contexts/views-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddViewModal } from '@/components/admin/add-view-modal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';


function ViewCard({ view, onDelete, isLandingView, onSetLandingView }: { view: View, onDelete: (viewId: string) => void, isLandingView: boolean, onSetLandingView: (viewId: string | null) => void }) {
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAlertOpen(true);
    };

    const confirmDelete = () => {
        onDelete(view.id);
        setIsAlertOpen(false);
    }

    return (
        <>
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the "{view.name}" view.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-neutral-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="group relative">
                <Link href={view.href}>
                    <Card className="bg-[#2a2a2a] border-neutral-700 text-white rounded-lg h-full cursor-pointer hover:border-yellow-500 transition-colors min-h-[240px]">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <view.icon className="h-8 w-8 text-yellow-500" />
                            <CardTitle className="text-lg font-medium">{view.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-neutral-400">
                                {view.imageUrl ? `Contains ${view.selections?.length || 0} selections.` : 'No image uploaded yet.'}
                            </p>
                        </CardContent>
                    </Card>
                </Link>
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                 <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <Label htmlFor={`landing-${view.id}`} className="text-xs text-neutral-400 select-none">Use on Landing</Label>
                    <Switch
                      id={`landing-${view.id}`}
                      checked={isLandingView}
                      onCheckedChange={(checked) => onSetLandingView(checked ? view.id : null)}
                      disabled={!view.imageUrl}
                    />
                </div>
            </div>
        </>
    );
}


export default function ProjectViewsPage({ params }: { params: { projectId: string } }) {
    const projectName = params.projectId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const { views, deleteView, landingPageViewId, setLandingPageViewId } = useViews();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Local state to track the selection before saving
    const [selectedId, setSelectedId] = useState<string | null>(landingPageViewId);

    useEffect(() => {
        setSelectedId(landingPageViewId);
    }, [landingPageViewId]);

    const handleSaveChanges = () => {
        setLandingPageViewId(selectedId);
        // Maybe add a toast notification for feedback
    };
    
    // Determine if there are unsaved changes
    const hasUnsavedChanges = selectedId !== landingPageViewId;

    return (
        <>
        <AddViewModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        <div className="flex flex-col h-full bg-[#313131]">
             <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-neutral-700 bg-[#3c3c3c]">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold text-white">{projectName} / Views</h1>
                </div>
                {hasUnsavedChanges && (
                    <Button onClick={handleSaveChanges} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                        <Check className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                )}
            </header>
            <div className="flex-1 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {views.map((view) => (
                        <ViewCard
                          key={view.id}
                          view={view}
                          onDelete={deleteView}
                          isLandingView={selectedId === view.id}
                          onSetLandingView={setSelectedId}
                        />
                    ))}
                     <Card 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-[#2a2a2a] border-neutral-700 text-white flex flex-col items-center justify-center min-h-[240px] rounded-lg border-2 border-dashed border-neutral-600 hover:border-yellow-500 hover:text-yellow-500 cursor-pointer transition-colors"
                     >
                        <CardHeader className="items-center text-center p-4">
                            <Plus className="h-8 w-8 mb-2" />
                            <CardTitle className="text-lg font-medium">Add New View</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </div>
        </>
    );
}
