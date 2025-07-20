
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import { useState } from 'react';

interface AddViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: string;
}

const formSchema = z.object({
    name: z.string().min(1, 'View name is required'),
    type: z.string({
        required_error: "Please select a view type.",
    }),
    splatUrl: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
    splatFile: z.any().optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'Gausian Splatting') {
        if (!data.splatUrl && !data.splatFile) {
            ctx.addIssue({
                code: 'custom',
                path: ['splatUrl'],
                message: 'Either a URL or a file is required for Gausian Splatting views.',
            });
             ctx.addIssue({
                code: 'custom',
                path: ['splatFile'],
                message: 'Either a URL or a file is required for Gausian Splatting views.',
            });
        }
         if (data.splatUrl && data.splatFile) {
            ctx.addIssue({
                code: 'custom',
                path: ['splatUrl'],
                message: 'Please provide either a URL or a file, not both.',
            });
        }
    }
});

export function AddViewModal({ isOpen, onClose, entityId }: AddViewModalProps) {
    const { addView, viewTypes } = useProjectData();
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            type: viewTypes[0] || '',
            splatUrl: '',
        },
    });

    const { formState: { isSubmitting }, watch } = form;
    const selectedViewType = watch('type');
    const [fileName, setFileName] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.splat')) {
                 toast({
                    title: 'Invalid File Type',
                    description: 'Please upload a .splat file.',
                    variant: 'destructive',
                });
                form.setValue('splatFile', null);
                setFileName('');
                return;
            }
            form.setValue('splatFile', file);
            setFileName(file.name);
            form.clearErrors('splatFile');
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            let splatDataSource: string | File | undefined = values.splatUrl;
            if(values.splatFile) {
                splatDataSource = values.splatFile;
            }

            const newViewHref = await addView(entityId, values.name, values.type, splatDataSource);
            if (newViewHref) {
                onClose();
                form.reset();
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
        } catch (error) {
             toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
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
                                            {viewTypes.map(type => (
                                                <SelectItem key={type} value={type} className="capitalize hover:bg-neutral-700">{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedViewType === 'Gausian Splatting' && (
                            <>
                                 <FormField
                                    control={form.control}
                                    name="splatUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Splat URL</FormLabel>
                                            <FormControl>
                                                <Input className="bg-[#313131] border-neutral-600 text-white" placeholder="https://example.com/scene.splat" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-center gap-2">
                                    <div className="flex-grow border-t border-neutral-700"></div>
                                    <span className="text-xs text-neutral-500">OR</span>
                                    <div className="flex-grow border-t border-neutral-700"></div>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="splatFile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Upload .splat File</FormLabel>
                                            <FormControl>
                                                <div>
                                                    <Input type="file" id="splatFileUpload" className="hidden" onChange={handleFileChange} accept=".splat"/>
                                                    <label htmlFor="splatFileUpload" className="flex items-center justify-center w-full h-20 border-2 border-neutral-600 border-dashed rounded-lg cursor-pointer bg-[#313131] hover:bg-neutral-700">
                                                        {fileName ? (
                                                            <p className="text-sm text-green-400">{fileName}</p>
                                                        ) : (
                                                            <div className="text-center text-neutral-400">
                                                                <Upload className="mx-auto h-6 w-6" />
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
                            </>
                        )}


                        <DialogFooter className="!mt-4">
                            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700 text-white">Cancel</Button>
                            <Button type="submit" loading={isSubmitting} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                                {selectedViewType === 'Gausian Splatting' ? 'Next' : 'Add View'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
