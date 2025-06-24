'use client';

import { useRouter } from 'next/navigation';
import { useProjectData } from '@/contexts/views-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Corrected path for toast
import { useToast } from '@/hooks/use-toast';

interface AddViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: string;
}

export function AddViewModal({ isOpen, onClose, entityId }: AddViewModalProps) {
    const { addView } = useProjectData();
    const { toast } = useToast();
    const router = useRouter();

    const formSchema = z.object({
        name: z.string().min(1, 'View name is required'),
        type: z.enum(['2d', '360'], {
            required_error: "Please select a view type.",
        }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            type: '2d',
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        const newViewHref = addView(entityId, values.name, values.type);
        if (newViewHref) {
            onClose();
            form.reset();
            // Navigate after state update and modal close
            setTimeout(() => {
                router.push(newViewHref);
            }, 0);
        } else {
            toast({
                title: 'Error creating view',
                description: 'Failed to add the new view. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-white">Add New View</DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        Enter details for your new view within this entity. You can change these later.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">View Name</FormLabel>
                                    <FormControl>
                                        <Input className="bg-[#313131] border-neutral-600 text-white" placeholder="e.g., Living Room" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">View Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-[#313131] border-neutral-600 text-white">
                                                <SelectValue placeholder="Select a view type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-[#2a2a2a] text-white border-neutral-700">
                                            <SelectItem value="2d">2D image</SelectItem>
                                            <SelectItem value="360">360 panoramic image</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700 text-white">Cancel</Button>
                            <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-black">Add View</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
