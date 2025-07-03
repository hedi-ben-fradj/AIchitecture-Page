
'use client';

import { useEffect, useCallback } from 'react';
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
import { entityTypes, type EntityType } from '@/contexts/views-context';

const selectionDetailsSchema = z.object({
    title: z.string().min(1, 'Title is required.'),
    description: z.string().optional(),
    defineSize: z.boolean().default(false).optional(),
    width: z.coerce.number().positive('Width must be a positive number.').optional().or(z.literal('')),
    height: z.coerce.number().positive('Height must be a positive number.').optional().or(z.literal('')),
    area: z.coerce.number().positive('Area must be a positive number.').optional().or(z.literal('')),
    makeAsEntity: z.boolean().default(false).optional(),
    entityType: z.enum(entityTypes).optional(),
});

type SelectionDetailsFormValues = z.infer<typeof selectionDetailsSchema>;

interface SelectionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Polygon['details']) => void;
    selectionData?: Polygon | null;
    parentEntityType?: EntityType;
}

export default function SelectionDetailsModal({ isOpen, onClose, onSave, selectionData, parentEntityType }: SelectionDetailsModalProps) {
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
            entityType: entityTypes[2], // Default to Apartment
        },
    });
    
    const makeAsEntity = form.watch('makeAsEntity');
    const defineSize = form.watch('defineSize');
    const width = form.watch('width');
    const height = form.watch('height');
    const { dirtyFields } = form.formState;

    const dimensionsEdited = dirtyFields.width || dirtyFields.height;
    const areaEdited = dirtyFields.area;

    // Calculate area from dimensions
    useEffect(() => {
        if (dimensionsEdited && Number(width) > 0 && Number(height) > 0) {
            form.setValue('area', parseFloat((Number(width) * Number(height)).toFixed(2)), {
                shouldValidate: true,
                shouldDirty: false, // Don't mark area as dirty when auto-calculated
            });
        }
    }, [width, height, dimensionsEdited, form]);

    // Clear size/area fields when checkbox is unchecked
    useEffect(() => {
        if (!defineSize) {
            form.setValue('width', '');
            form.setValue('height', '');
            form.setValue('area', '');
            // Reset dirty status to allow re-editing
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
                return 'Apartment'; // A sensible default
        }
    }, [parentEntityType]);

    useEffect(() => {
        if (selectionData?.details) {
          form.reset({
            ...selectionData.details,
            width: selectionData.details.width || '',
            height: selectionData.details.height || '',
            area: selectionData.details.area || '',
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
            entityType: getDefaultEntityType(),
          });
        }
    }, [selectionData, form, getDefaultEntityType]);

    const onSubmit = (data: SelectionDetailsFormValues) => {
        const saveData: Polygon['details'] = {
            ...data,
            width: data.width ? Number(data.width) : undefined,
            height: data.height ? Number(data.height) : undefined,
            area: data.area ? Number(data.area) : undefined,
        };
        onSave(saveData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>Selection Details</DialogTitle>
                    <DialogDescription>Add more information to this selected area.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            <div className="space-y-4 pt-2 border-t border-neutral-700/50">
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

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700">Cancel</Button>
                            <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-black">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
