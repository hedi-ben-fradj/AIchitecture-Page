'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddProjectFromTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddProject: (name: string, description: string, template: string) => void;
}

const templates = [
    "Residential Real-Estate Project",
    "Commercial Real-Estate Project"
];

export function AddProjectFromTemplateModal({ isOpen, onClose, onAddProject }: AddProjectFromTemplateModalProps) {
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);

    const handleCreate = () => {
        if (!projectName.trim() || !selectedTemplate) {
            return;
        }
        onAddProject(projectName, projectDescription, selectedTemplate);
        onClose();
        setProjectName('');
        setProjectDescription('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>Create Project From Template</DialogTitle>
                    <DialogDescription>Select a template and provide a name for your new project.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="template-name" className="text-right">
                            Template
                        </Label>
                        <Select onValueChange={setSelectedTemplate} defaultValue={selectedTemplate}>
                            <SelectTrigger className="col-span-3 bg-[#313131] border-neutral-600">
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                {templates.map(template => (
                                    <SelectItem key={template} value={template} className="hover:bg-neutral-700">{template}</SelectItem>
                                ))}
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
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700">Cancel</Button>
                    <Button type="submit" onClick={handleCreate} disabled={!projectName.trim()} className="bg-yellow-500 hover:bg-yellow-600 text-black">Create Project</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
