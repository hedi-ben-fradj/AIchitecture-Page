
'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import type { Polygon } from './image-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectData, type EntityType, type Entity } from '@/contexts/views-context';
import { Separator } from '../ui/separator';

const selectionDetailsSchema = z.object({
    linkToExisting: z.boolean().default(false),
    linkedEntityId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    defineSize: z.boolean().default(false).optional(),
    width: z.coerce.number().positive('Width must be a positive number.').optional().or(z.literal('')),
    height: z.coerce.number().positive('Height must be a positive number.').optional().or(z.literal('')),
    area: z.coerce.number().positive('Area must be a positive number.').optional().or(z.literal('')),
    makeAsEntity: z.boolean().default(false).optional(),
    entityType: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.linkToExisting) {
        if (!data.linkedEntityId) {
            ctx.addIssue({ code: 'custom', path: ['linkedEntityId'], message: 'Please select an entity to link.' });
        }
    } else {
        if (!data.title) {
            ctx.addIssue({ code: 'custom', path: ['title'], message: 'Title is required.' });
        }
        if (data.makeAsEntity && !data.entityType) {
            ctx.addIssue({ code: 'custom', path: ['entityType'], message: 'Entity type is required.' });
        }
    }
});


type SelectionDetailsFormValues = z.infer<typeof selectionDetailsSchema>;

interface SelectionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Polygon['details']) => void;
    onMakeEntity?: (entityName: string, entityType: EntityType) => Promise<string | null>;
    selectionData?: Polygon | null;
    parentEntityType?: EntityType;
    entityId?: string;
}

export default function SelectionDetailsModal({ isOpen, onClose, onSave, onMakeEntity, selectionData, parentEntityType, entityId }: SelectionDetailsModalProps) {
    const { entityTypes, entities } = useProjectData();
    
    const childEntities = useMemo(() => {
        if (!entityId) return [];
        return entities.filter(e => e.parentId === entityId);
    }, [entityId, entities]);

    const form = useForm<SelectionDetailsFormValues>({
        resolver: zodResolver(selectionDetailsSchema),
        defaultValues: {
            title: '',
            description: '',
            defineSize: false,
            width: '',
            height: '',
            area: '',
            makeAsEntity: false,
            linkToExisting: false,
            linkedEntityId: '',
            entityType: 'Apartment',
        },
    });
    
    const linkToExisting = form.watch('linkToExisting');
    const makeAsEntity = form.watch('makeAsEntity');
    const defineSize = form.watch('defineSize');
    const width = form.watch('width');
    const height = form.watch('height');
    const { dirtyFields } = form.formState;

    const dimensionsEdited = dirtyFields.width || dirtyFields.height;
    const areaEdited = dirtyFields.area;

    useEffect(() => {
        if (dimensionsEdited && Number(width) > 0 && Number(height) > 0) {
            form.setValue('area', parseFloat((Number(width) * Number(height)).toFixed(2)), {
                shouldValidate: true,
                shouldDirty: false,
            });
        }
    }, [width, height, dimensionsEdited, form]);

    useEffect(() => {
        if (!defineSize) {
            form.setValue('width', '');
            form.setValue('height', '');
            form.setValue('area', '');
            form.resetField('width');
            form.resetField('height');
            form.resetField('area');
        }
    }, [defineSize, form]);
    
    const getDefaultEntityType = useCallback((): EntityType => {
        switch (parentEntityType) {
            case 'residential compound':
                return 'residential building';
            case 'residential building':
                return 'Apartment';
            case 'Apartment':
            case 'house':
                return 'Room';
            default:
                return 'Apartment';
        }
    }, [parentEntityType]);

    useEffect(() => {
        if (selectionData?.details) {
            const isLinked = !!selectionData.details.linkedEntityId && childEntities.some(child => child.id === selectionData.details!.linkedEntityId);
            
            form.reset({
                ...selectionData.details,
                width: selectionData.details.width || '',
                height: selectionData.details.height || '',
                area: selectionData.details.area || '',
                linkToExisting: isLinked,
                linkedEntityId: isLinked ? selectionData.details.linkedEntityId : '',
            });
        } else {
            form.reset({
                title: '',
                description: '',
                defineSize: false,
                width: '',
                height: '',
                area: '',
                makeAsEntity: false,
                linkToExisting: false,
                linkedEntityId: '',
                entityType: getDefaultEntityType(),
            });
        }
    }, [selectionData, form, getDefaultEntityType, childEntities]);

    const onSubmit = async (data: SelectionDetailsFormValues) => {
        let saveData: Polygon['details'];

        if (data.linkToExisting && data.linkedEntityId) {
            const linkedEntity = childEntities.find(e => e.id === data.linkedEntityId);
            if (!linkedEntity) {
                console.error("Could not find the linked entity.");
                return;
            }
            saveData = {
                title: linkedEntity.name,
                description: linkedEntity.name,
                makeAsEntity: true,
                entityType: linkedEntity.entityType,
                linkedEntityId: linkedEntity.id,
            };
        } else {
            let newEntityId: string | null = null;
            if (data.makeAsEntity && data.title && data.entityType && onMakeEntity) {
                newEntityId = await onMakeEntity(data.title, data.entityType as EntityType);
                if (!newEntityId) {
                    console.error("Failed to create entity.");
                    // Optionally: show a toast to the user
                    return;
                }
            }

            saveData = {
                title: data.title!,
                description: data.description,
                defineSize: data.defineSize,
                width: data.width ? Number(data.width) : undefined,
                height: data.height ? Number(data.height) : undefined,
                area: data.area ? Number(data.area) : undefined,
                makeAsEntity: data.makeAsEntity,
                entityType: data.makeAsEntity ? (data.entityType as EntityType) : undefined,
                linkedEntityId: newEntityId ?? undefined,
            };
        }
        
        onSave(saveData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>Selection Details</DialogTitle>
                    <DialogDescription>Add more information to this selected area.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                         <FormField
                            control={form.control}
                            name="linkToExisting"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-neutral-600 p-3 shadow-sm bg-[#313131]">
                                    <div className="space-y-0.5">
                                        <FormLabel>Link to an existing child entity</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        
                        <Separator className="bg-neutral-600" />
                        
                        {linkToExisting ? (
                            <FormField
                                control={form.control}
                                name="linkedEntityId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Child Entity</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-[#313131] border-neutral-600">
                                                    <SelectValue placeholder="Select an entity to link" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                                {childEntities.length > 0 ? childEntities.map(child => (
                                                    <SelectItem key={child.id} value={child.id} className="capitalize hover:bg-neutral-700">{child.name}</SelectItem>
                                                )) : (
                                                    <div className="px-2 py-1.5 text-sm text-neutral-400">No child entities found.</div>
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
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Living Room" {...field} className="bg-[#313131] border-neutral-600" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="A spacious area with large windows." {...field} className="bg-[#313131] border-neutral-600" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <FormField
                                    control={form.control}
                                    name="defineSize"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-neutral-600 p-3 shadow-sm bg-[#313131]">
                                            <div className="space-y-0.5">
                                                <FormLabel>Define Size/Area</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {defineSize && (
                                    <div className="space-y-4 pt-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="width"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Width (m)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" placeholder="5.5" {...field} disabled={areaEdited} className="bg-[#313131] border-neutral-600" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="height"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Height (m)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" placeholder="4.2" {...field} disabled={areaEdited} className="bg-[#313131] border-neutral-600" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-grow border-t border-neutral-700"></div>
                                            <span className="text-xs text-neutral-500">OR</span>
                                            <div className="flex-grow border-t border-neutral-700"></div>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="area"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Area (m²)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="23.1" {...field} disabled={dimensionsEdited} className="bg-[#313131] border-neutral-600" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                <FormField
                                    control={form.control}
                                    name="makeAsEntity"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-neutral-600 p-3 shadow-sm bg-[#313131]">
                                            <div className="space-y-0.5">
                                                <FormLabel>Make Entity</FormLabel>
                                                <FormDescription className="text-neutral-400">
                                                    Create a new navigable entity from this selection.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {makeAsEntity && (
                                <FormField
                                        control={form.control}
                                        name="entityType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>New Entity Type</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-[#313131] border-neutral-600">
                                                            <SelectValue placeholder="Select a type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                                        {entityTypes.map(type => (
                                                            <SelectItem key={type} value={type} className="capitalize hover:bg-neutral-700">{type}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        )}

                        <DialogFooter className="pt-4 !mt-6">
                            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700">Cancel</Button>
                            <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-black">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
