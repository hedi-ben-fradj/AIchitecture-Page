'use client';

import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Polygon } from './image-editor';

const selectionDetailsSchema = z.object({
    title: z.string().min(1, 'Title is required.'),
    description: z.string().optional(),
    width: z.coerce.number().positive('Width must be a positive number.'),
    height: z.coerce.number().positive('Height must be a positive number.'),
});

type SelectionDetailsFormValues = z.infer<typeof selectionDetailsSchema>;

interface SelectionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: SelectionDetailsFormValues) => void;
    selectionData?: Polygon | null;
}

export default function SelectionDetailsModal({ isOpen, onClose, onSave, selectionData }: SelectionDetailsModalProps) {
    const form = useForm<SelectionDetailsFormValues>({
        resolver: zodResolver(selectionDetailsSchema),
        defaultValues: {
            title: '',
            description: '',
            width: 0,
            height: 0,
        },
    });
    
    useEffect(() => {
        if (selectionData?.details) {
          form.reset(selectionData.details);
        } else {
          form.reset({
            title: '',
            description: '',
            width: 0,
            height: 0,
          });
        }
    }, [selectionData, form]);

    const onSubmit = (data: SelectionDetailsFormValues) => {
        onSave(data);
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
                         <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="width"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Width (m)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="5.5" {...field} className="bg-[#313131] border-neutral-600" />
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
                                             <Input type="number" placeholder="4.2" {...field} className="bg-[#313131] border-neutral-600" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex items-center space-x-2 pt-4">
                            <Switch id="make-view" disabled />
                            <Label htmlFor="make-view" className="text-neutral-400">Make View (Coming Soon)</Label>
                        </div>

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
