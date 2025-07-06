
'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectData, type Entity, type Hotspot } from '@/contexts/views-context';
import { Separator } from '../ui/separator';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';


const hotspotDetailsSchema = z.object({
    linkToExisting: z.boolean().default(false),
    linkedViewId: z.string().optional(),
    newViewName: z.string().optional(),
    newViewType: z.string().optional(),
    newViewImage: z.any().optional(),
}).superRefine((data, ctx) => {
    if (data.linkToExisting) {
        if (!data.linkedViewId) {
            ctx.addIssue({ code: 'custom', path: ['linkedViewId'], message: 'Please select a view to link.' });
        }
    } else {
        if (!data.newViewName) {
            ctx.addIssue({ code: 'custom', path: ['newViewName'], message: 'View name is required.' });
        }
        if (!data.newViewType) {
            ctx.addIssue({ code: 'custom', path: ['newViewType'], message: 'View type is required.' });
        }
        if (!data.newViewImage) {
            ctx.addIssue({ code: 'custom', path: ['newViewImage'], message: 'An image is required.' });
        }
    }
});


type HotspotFormValues = z.infer<typeof hotspotDetailsSchema>;

interface HotspotDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { linkedViewId: string }) => void;
    entity: Entity | null;
    hotspot: Hotspot | null;
}

export default function HotspotDetailsModal({ isOpen, onClose, onSave, entity, hotspot }: HotspotDetailsModalProps) {
    const { addView, updateViewImage, viewTypes, getEntity } = useProjectData();
    const params = useParams<{ projectId?: string; entityId: string }>();
    const { toast } = useToast();
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const form = useForm<HotspotFormValues>({
        resolver: zodResolver(hotspotDetailsSchema),
        defaultValues: {
            linkToExisting: true,
            linkedViewId: '',
            newViewName: '',
            newViewType: viewTypes[0] || '',
            newViewImage: undefined,
        },
    });

    const fileInputRef = form.register('newViewImage');

    useEffect(() => {
        if (hotspot?.linkedViewId) {
            form.reset({
                linkToExisting: true,
                linkedViewId: hotspot.linkedViewId,
            });
        } else {
            form.reset({
                linkToExisting: false,
                linkedViewId: '',
                newViewName: '',
                newViewType: viewTypes[0] || '',
                newViewImage: undefined,
            });
        }
        setPreviewImage(null);
    }, [hotspot, isOpen, form, viewTypes]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setPreviewImage(event.target?.result as string);
            reader.readAsDataURL(file);
            form.setValue('newViewImage', file);
        }
    };
    
    const onSubmit = async (data: HotspotFormValues) => {
        if (data.linkToExisting) {
            if (data.linkedViewId) {
                onSave({ linkedViewId: data.linkedViewId });
                onClose();
            }
        } else {
            const { newViewName, newViewType, newViewImage } = data;
            if (!newViewName || !newViewType || !newViewImage) {
                toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out all fields for the new view.' });
                return;
            }
            if (!entity || !params.projectId) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not find entity or project context.' });
                return;
            }
            
            const newViewHref = await addView(entity.id, newViewName, newViewType);
            if (!newViewHref) {
                toast({ variant: 'destructive', title: 'Failed to create view', description: 'A view with this name may already exist.' });
                return;
            }

            const newViewId = decodeURIComponent(newViewHref.split('/').pop()!);

            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageUrl = e.target?.result as string;
                await updateViewImage(entity.id, newViewId, imageUrl);
                onSave({ linkedViewId: newViewId });
                toast({ title: 'Success!', description: `Hotspot linked to new view "${newViewName}".`});
                onClose();
            };
            reader.readAsDataURL(newViewImage);
        }
    };

    const availableViews = entity?.views.filter(v => v.id !== (hotspot?.linkedViewId || '')) || [];
    const linkToExisting = form.watch('linkToExisting');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>Set Hotspot View</DialogTitle>
                    <DialogDescription>Link this hotspot to an existing view or create a new one.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                         <FormField
                            control={form.control}
                            name="linkToExisting"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-neutral-600 p-3 shadow-sm bg-[#313131]">
                                    <FormLabel>Link to an existing view</FormLabel>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        
                        <Separator className="bg-neutral-600" />
                        
                        {linkToExisting ? (
                            <FormField
                                control={form.control}
                                name="linkedViewId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Available Views</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-[#313131] border-neutral-600">
                                                    <SelectValue placeholder="Select a view to link" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                                {availableViews.length > 0 ? availableViews.map(view => (
                                                    <SelectItem key={view.id} value={view.id} className="capitalize hover:bg-neutral-700">{view.name}</SelectItem>
                                                )) : (
                                                    <div className="px-2 py-1.5 text-sm text-neutral-400">No other views available in this entity.</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="newViewName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New View Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Bedroom View" {...field} className="bg-[#313131] border-neutral-600" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="newViewType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New View Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-[#313131] border-neutral-600">
                                                        <SelectValue placeholder="Select a type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                                    {viewTypes.map(type => (
                                                        <SelectItem key={type} value={type} className="capitalize hover:bg-neutral-700">{type}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="newViewImage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New View Image</FormLabel>
                                            <FormControl>
                                                <div>
                                                    <Input type="file" id="newViewImageUpload" className="hidden" onChange={handleFileChange} accept="image/*"/>
                                                    <label htmlFor="newViewImageUpload" className="flex items-center justify-center w-full h-32 border-2 border-neutral-600 border-dashed rounded-lg cursor-pointer bg-[#313131] hover:bg-neutral-700">
                                                        {previewImage ? (
                                                            <img src={previewImage} alt="Preview" className="h-full w-full object-contain rounded-md" />
                                                        ) : (
                                                            <div className="text-center text-neutral-400">
                                                                <Upload className="mx-auto h-8 w-8" />
                                                                <p className="text-sm">Click to upload</p>
                                                            </div>
                                                        )}
                                                    </label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <DialogFooter className="pt-4 !mt-6">
                            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700">Cancel</Button>
                            <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-black">Save Hotspot</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
