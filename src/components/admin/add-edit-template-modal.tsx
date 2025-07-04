
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';

export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    content: string; // JSON string
}

interface AddEditTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (templateData: Omit<ProjectTemplate, 'id'>, id?: string) => void;
    template: Omit<ProjectTemplate, 'id'> | ProjectTemplate | null;
}

const formSchema = z.object({
    name: z.string().min(2, "Template name must be at least 2 characters."),
    description: z.string().min(10, "Description must be at least 10 characters."),
    content: z.string().min(2, "JSON content cannot be empty.").refine((val) => {
        try {
            JSON.parse(val);
            return true;
        } catch (e) {
            return false;
        }
    }, { message: "Content must be valid JSON." }),
});

const defaultTemplateContent = `{
    "projectName": "<Project Name>",
    "projectDescription": "<Project Description>",
    "projectEntities": [
        {
            "entityName": "<Entity Name>",
            "entityType": "<Entity Type>",
            "entityDescription": "<Entity Description>",
            "childEntities": [
                {
                    "entityName": "<Entity Name>",
                    "entityType": "<Entity Type>",
                    "entityDescription": "<Entity Description>",
                    "childEntities": []
                }
            ]
        }
    ]
}`;


export function AddEditTemplateModal({ isOpen, onClose, onSave, template }: AddEditTemplateModalProps) {
    const isEditing = template && 'id' in template && template.id;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            content: defaultTemplateContent,
        },
    });
    
    useEffect(() => {
        if (template) {
            form.reset({
                name: template.name || '',
                description: template.description || '',
                content: template.content || defaultTemplateContent,
            });
        } else {
             form.reset({
                name: '',
                description: '',
                content: defaultTemplateContent,
            });
        }
    }, [template, form]);

    const handleSave = (values: z.infer<typeof formSchema>) => {
        onSave(values, isEditing ? (template as ProjectTemplate).id : undefined);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>{isEditing ? `Edit "${(template as ProjectTemplate)?.name}"` : 'Create New Project Template'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Update the details for this template.' : 'Define a new reusable project template.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Template Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Residential Complex" {...field} className="bg-[#313131] border-neutral-600" />
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
                                        <Textarea placeholder="A template for multi-building residential projects." {...field} className="bg-[#313131] border-neutral-600" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Template Content (JSON)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder='{ "entities": [], "entityTypes": [] }' {...field} className="bg-[#313131] border-neutral-600 h-96 font-mono text-xs" />
                                    </FormControl>
                                     <FormDescription>
                                        Provide the template structure in JSON format.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="!mt-6">
                            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700">Cancel</Button>
                            <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-black">
                                {isEditing ? 'Save Changes' : 'Create Template'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
