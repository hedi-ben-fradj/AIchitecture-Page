
'use client';

import { useState, useEffect } from 'react';
import { useProjectData, entityTypes, type EntityType, type Entity } from '@/contexts/views-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Separator } from '../ui/separator';

interface EditEntityModalProps {
    isOpen: boolean;
    onClose: () => void;
    entity: Entity | null;
}

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    entityType: z.enum(entityTypes),
    plotArea: z.coerce.number().optional(),
    houseArea: z.coerce.number().optional(),
    price: z.coerce.number().optional(),
    status: z.enum(['available', 'sold']).optional(),
    availableDate: z.string().optional(),
    floors: z.coerce.number().optional(),
    rooms: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;


export function EditEntityModal({ isOpen, onClose, entity }: EditEntityModalProps) {
    const { updateEntity } = useProjectData();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const entityType = form.watch('entityType');

    useEffect(() => {
        if (entity) {
            form.reset({
                name: entity.name,
                entityType: entity.entityType,
                plotArea: entity.plotArea || undefined,
                houseArea: entity.houseArea || undefined,
                price: entity.price || undefined,
                status: entity.status || 'available',
                availableDate: entity.availableDate || '',
                floors: entity.floors || 1,
                rooms: entity.rooms || 1,
            });
        }
    }, [entity, form]);

    const handleSave = (data: FormValues) => {
        if (!entity) return;
        
        updateEntity(entity.id, data);
        toast({
            title: 'Entity Updated',
            description: `"${data.name}" has been saved.`,
        });
        onClose();
    };
    
    if (!entity) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Entity Details</DialogTitle>
                    <DialogDescription>
                        Update the details for your entity.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleSave)}>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="entity-name">Name</Label>
                                <Input
                                    id="entity-name"
                                    {...form.register('name')}
                                    className="mt-2 bg-[#313131] border-neutral-600"
                                    placeholder="e.g., Apartment A-12"
                                />
                                {form.formState.errors.name && <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>}
                            </div>
                             <div>
                                <Label htmlFor="entity-type">Type</Label>
                                <Controller
                                    control={form.control}
                                    name="entityType"
                                    render={({ field }) => (
                                         <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="mt-2 bg-[#313131] border-neutral-600">
                                                <SelectValue placeholder="Select an entity type" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                                {entityTypes.map(type => (
                                                    <SelectItem key={type} value={type} className="capitalize hover:bg-neutral-700">{type}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>

                        {(entityType === 'Apartment' || entityType === 'house') && (
                            <>
                                <Separator className="bg-neutral-600" />
                                <div className="grid grid-cols-3 gap-4">
                                     <div>
                                        <Label htmlFor="price">Price (EUR)</Label>
                                        <Input id="price" type="number" {...form.register('price')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="150000" />
                                    </div>
                                    <div>
                                        <Label htmlFor="status">Status</Label>
                                         <Controller
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="mt-2 bg-[#313131] border-neutral-600">
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                                        <SelectItem value="available">Available</SelectItem>
                                                        <SelectItem value="sold">Sold</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="availableDate">Available Date</Label>
                                        <Input id="availableDate" {...form.register('availableDate')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="e.g., 3Q/2024" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <Label htmlFor="plotArea">Plot Area (m²)</Label>
                                        <Input id="plotArea" type="number" {...form.register('plotArea')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="900" />
                                    </div>
                                    <div>
                                        <Label htmlFor="houseArea">House Area (m²)</Label>
                                        <Input id="houseArea" type="number" {...form.register('houseArea')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="150" />
                                    </div>
                                    <div>
                                        <Label htmlFor="floors">Floors</Label>
                                        <Input id="floors" type="number" {...form.register('floors')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="1" />
                                    </div>
                                    <div>
                                        <Label htmlFor="rooms">Rooms</Label>
                                        <Input id="rooms" type="number" {...form.register('rooms')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="3" />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700">Cancel</Button>
                        <Button type="submit" disabled={!form.formState.isDirty} className="bg-yellow-500 hover:bg-yellow-600 text-black">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
