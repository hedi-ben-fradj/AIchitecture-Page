
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProjectTemplate } from './add-edit-template-modal';

interface AddProjectFromTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddProject: (name: string, description: string, templateContent: string) => void;
}

const TEMPLATES_STORAGE_KEY = 'project_templates';


export function AddProjectFromTemplateModal({ isOpen, onClose, onAddProject }: AddProjectFromTemplateModalProps) {
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [templateContent, setTemplateContent] = useState('');

     useEffect(() => {
        if (isOpen && typeof window !== 'undefined') {
            try {
                const storedTemplatesStr = localStorage.getItem(TEMPLATES_STORAGE_KEY);
                const loadedTemplates: ProjectTemplate[] = storedTemplatesStr ? JSON.parse(storedTemplatesStr) : [];
                setTemplates(loadedTemplates);
                if (loadedTemplates.length > 0 && !selectedTemplateId) {
                    setSelectedTemplateId(loadedTemplates[0].id);
                } else if (loadedTemplates.length === 0) {
                    setSelectedTemplateId('');
                }
            } catch (error) {
                console.error("Failed to load templates from localStorage", error);
                setTemplates([]);
            }
        }
    }, [isOpen, selectedTemplateId]);

    useEffect(() => {
        if(selectedTemplateId && templates.length > 0) {
            const template = templates.find(t => t.id === selectedTemplateId);
            if (template) {
                setTemplateContent(template.content);
            }
        } else {
            setTemplateContent('');
        }
    }, [selectedTemplateId, templates]);


    // Reset form on close to ensure fresh state
    useEffect(() => {
        if (!isOpen) {
            setProjectName('');
            setProjectDescription('');
            if (templates.length > 0) {
              setSelectedTemplateId(templates[0].id);
            } else {
              setSelectedTemplateId('');
            }
        }
    }, [isOpen, templates]);


    const handleCreate = () => {
        if (!projectName.trim() || !selectedTemplateId || !templateContent) {
            return;
        }
        onAddProject(projectName, projectDescription, templateContent);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>Create Project From Template</DialogTitle>
                    <DialogDescription>Select a template, customize it if needed, and provide a name for your new project.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="template-name" className="text-right">
                            Template
                        </Label>
                        <Select onValueChange={setSelectedTemplateId} value={selectedTemplateId}>
                            <SelectTrigger className="col-span-3 bg-[#313131] border-neutral-600">
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
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="project-name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="project-name"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="col-span-3 bg-[#313131] border-neutral-600"
                            placeholder="e.g., Downtown Plaza"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="project-description" className="text-right">
                            Description
                        </Label>
                        <Textarea
                            id="project-description"
                            value={projectDescription}
                            onChange={(e) => setProjectDescription(e.target.value)}
                            className="col-span-3 bg-[#313131] border-neutral-600"
                            placeholder="A short description of the project."
                        />
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
                    <Button type="submit" onClick={handleCreate} disabled={!projectName.trim() || !selectedTemplateId || !templateContent} className="bg-yellow-500 hover:bg-yellow-600 text-black">Create Project</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
