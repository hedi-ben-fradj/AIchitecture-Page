
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProjectTemplate } from './add-edit-template-modal';
import { useToast } from '@/hooks/use-toast';

interface AddProjectFromTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddProject: (name: string, description: string, templateContent: string) => void;
}

const TEMPLATES_STORAGE_KEY = 'project_templates';

export function AddProjectFromTemplateModal({ isOpen, onClose, onAddProject }: AddProjectFromTemplateModalProps) {
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [templateContent, setTemplateContent] = useState('');
    const { toast } = useToast();

     useEffect(() => {
        if (isOpen && typeof window !== 'undefined') {
            try {
                const storedTemplatesStr = localStorage.getItem(TEMPLATES_STORAGE_KEY);
                const loadedTemplates: ProjectTemplate[] = storedTemplatesStr ? JSON.parse(storedTemplatesStr) : [];
                setTemplates(loadedTemplates);
            } catch (error) {
                console.error("Failed to load templates from localStorage", error);
                setTemplates([]);
            }
        }
    }, [isOpen]);

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setTemplateContent(template.content);
        } else {
            setTemplateContent('');
        }
    }

    // Reset form on close to ensure fresh state
    useEffect(() => {
        if (!isOpen) {
            setSelectedTemplateId('');
            setTemplateContent('');
        }
    }, [isOpen]);

    const handleCreate = () => {
        if (!selectedTemplateId || !templateContent) {
            toast({
                title: "Incomplete Information",
                description: "Please select a template and ensure it has content.",
                variant: "destructive",
            });
            return;
        }

        try {
            const parsedTemplate = JSON.parse(templateContent);
            const name = parsedTemplate.projectName;
            const description = parsedTemplate.projectDescription;

            if (!name) {
                toast({
                    title: "Invalid Template",
                    description: 'The template JSON must include a "projectName" property.',
                    variant: "destructive",
                });
                return;
            }

            onAddProject(name, description || '', templateContent);
            onClose();

        } catch (e) {
            toast({
                title: "JSON Error",
                description: "The template content is not valid JSON.",
                variant: "destructive",
            });
            console.error("JSON parsing error:", e);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>Create Project From Template</DialogTitle>
                    <DialogDescription>Select a template and customize its JSON content before creating the project.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <Label htmlFor="template-name">
                            Template
                        </Label>
                        <Select onValueChange={handleTemplateSelect} value={selectedTemplateId}>
                            <SelectTrigger id="template-name" className="w-full bg-[#313131] border-neutral-600">
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                 {templates.length > 0 ? (
                                    templates.map(template => (
                                        <SelectItem key={template.id} value={template.id} className="hover:bg-neutral-700">{template.name}</SelectItem>
                                    ))
                                ) : (
                                    <div className="px-2 py-1.5 text-sm text-neutral-400 text-center">No templates created yet.</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                   
                     {selectedTemplateId && (
                         <div className="space-y-2">
                            <Label htmlFor="template-content">
                                Template Content (JSON)
                            </Label>
                            <Textarea
                                id="template-content"
                                value={templateContent}
                                onChange={(e) => setTemplateContent(e.target.value)}
                                className="bg-[#313131] border-neutral-600 h-64 font-mono text-xs"
                                placeholder="Edit the template JSON as needed..."
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700">Cancel</Button>
                    <Button type="submit" onClick={handleCreate} disabled={!selectedTemplateId || !templateContent} className="bg-yellow-500 hover:bg-yellow-600 text-black">Create Project</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
