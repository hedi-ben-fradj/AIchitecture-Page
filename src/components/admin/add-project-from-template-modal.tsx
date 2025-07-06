
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProjectTemplate } from './add-edit-template-modal';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useProjectData, type Entity } from '@/contexts/views-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VisualTemplateEditor } from './visual-template-editor';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';


interface AddProjectFromTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddProject: (name: string, description: string, templateContent: string) => void;
}

// Recursive function to check for placeholder values like "<...>"
function checkForPlaceholders(obj: any): string | null {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'string') {
                if (value.startsWith('<') && value.endsWith('>')) {
                    return `Placeholder detected for "${key}": ${value}. Please replace all placeholders.`;
                }
            } else if (Array.isArray(value)) {
                for (const item of value) {
                    const result = checkForPlaceholders(item);
                    if (result) return result;
                }
            } else if (typeof value === 'object' && value !== null) {
                const result = checkForPlaceholders(value);
                if (result) return result;
            }
        }
    }
    return null;
}


export function AddProjectFromTemplateModal({ isOpen, onClose, onAddProject }: AddProjectFromTemplateModalProps) {
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [templateContent, setTemplateContent] = useState('');
    const [isVerified, setIsVerified] = useState<boolean>(false);
    const { toast } = useToast();
    const { entityTypes } = useProjectData();
    const [editorMode, setEditorMode] = useState<'json' | 'visual'>('json');
    const [projectData, setProjectData] = useState<any>(null);


    const templateSchema = useMemo(() => {
        const entitySchema: z.ZodType<any> = z.lazy(() =>
            z.object({
                entityName: z.string({ required_error: "'entityName' is required for every entity." }),
                entityType: z.string({ required_error: "'entityType' is required for every entity." })
                    .refine(val => entityTypes.map(t => t.toLowerCase()).includes(val.toLowerCase()), {
                        message: `Invalid entity type. Must be one of: ${entityTypes.join(', ')}`
                    }),
                entityDescription: z.string().optional(),
                childEntities: z.array(entitySchema).optional(),
            }).strict("Template contains an unknown property in an entity object. Please stick to the defined structure.")
        );

        return z.object({
            projectName: z.string({ required_error: "'projectName' is required at the root of the template." }),
            projectDescription: z.string({ required_error: "'projectDescription' is required at the root of the template." }),
            projectEntities: z.array(entitySchema),
        }).strict("Template contains an unknown property at the root. Please stick to the defined structure.");
    }, [entityTypes]);


     useEffect(() => {
        if (isOpen) {
            const loadTemplates = async () => {
                try {
                    const templatesSnapshot = await getDocs(collection(db, 'project_templates'));
                    const loadedTemplates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProjectTemplate[];
                    setTemplates(loadedTemplates);
                } catch (error) {
                    console.error("Failed to load templates from Firestore", error);
                    setTemplates([]);
                }
            };
            loadTemplates();
        }
    }, [isOpen]);

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setTemplateContent(template.content);
             try {
                const parsed = JSON.parse(template.content);
                setProjectData(parsed);
            } catch {
                setProjectData(null);
            }
        } else {
            setTemplateContent('');
            setProjectData(null);
        }
        setIsVerified(false);
    }

    // Reset form on close to ensure fresh state
    useEffect(() => {
        if (!isOpen) {
            setSelectedTemplateId('');
            setTemplateContent('');
            setProjectData(null);
            setIsVerified(false);
            setEditorMode('json');
        }
    }, [isOpen]);

    // Reset verification if content changes
    useEffect(() => {
        setIsVerified(false);
    }, [templateContent]);

    const handleUpdateProjectData = (newData: any) => {
        setProjectData(newData);
        setTemplateContent(JSON.stringify(newData, null, 2));
    };

    const handleEditorModeChange = (mode: 'json' | 'visual') => {
        if (mode === 'visual') {
            try {
                const parsed = JSON.parse(templateContent);
                setProjectData(parsed);
            } catch (e) {
                toast({ title: "Invalid JSON", description: "Cannot switch to visual editor. Please fix the JSON structure first.", variant: "destructive" });
                return;
            }
        }
        setEditorMode(mode);
    };

    const handleVerify = () => {
        if (!templateContent) {
            toast({ title: "Cannot Verify", description: "Template content is empty.", variant: "destructive" });
            setIsVerified(false);
            return;
        }

        let parsedTemplate;
        try {
            parsedTemplate = JSON.parse(templateContent);
        } catch (e) {
            toast({ title: "Verification Failed", description: "The template content is not valid JSON.", variant: "destructive" });
            setIsVerified(false);
            return;
        }

        const schemaResult = templateSchema.safeParse(parsedTemplate);
        if (!schemaResult.success) {
            const firstError = schemaResult.error.errors[0];
            const errorMessage = `Structure Error: ${firstError.message}`;
            toast({ title: "Verification Failed", description: errorMessage, variant: "destructive" });
            setIsVerified(false);
            return;
        }

        const placeholderError = checkForPlaceholders(schemaResult.data);
        if (placeholderError) {
            toast({ title: "Verification Failed", description: placeholderError, variant: "destructive" });
            setIsVerified(false);
            return;
        }

        toast({ title: "Success", description: "Template verified successfully." });
        setIsVerified(true);
    };


    const handleCreate = () => {
        if (!isVerified) {
             toast({
                title: "Not Verified",
                description: "Please verify the template before creating the project.",
                variant: "destructive",
            });
            return;
        }

        try {
            const parsedTemplate = JSON.parse(templateContent);
            const name = parsedTemplate.projectName;
            const description = parsedTemplate.projectDescription;

            onAddProject(name, description || '', templateContent);
            onClose();

        } catch (e) {
            toast({
                title: "Project Creation Error",
                description: "An unexpected error occurred. Please re-verify the template.",
                variant: "destructive",
            });
            console.error("JSON parsing error during creation:", e);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>Create Project From Template</DialogTitle>
                    <DialogDescription>Select a template and customize its content before creating the project.</DialogDescription>
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
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <Tabs defaultValue={editorMode} onValueChange={(value) => handleEditorModeChange(value as 'json' | 'visual')} className="w-auto">
                                    <TabsList>
                                        <TabsTrigger value="json">JSON</TabsTrigger>
                                        <TabsTrigger value="visual">Visual</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                           
                            {editorMode === 'json' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="template-content">Template Content (JSON)</Label>
                                    <Textarea
                                        id="template-content"
                                        value={templateContent}
                                        onChange={(e) => setTemplateContent(e.target.value)}
                                        className="bg-[#313131] border-neutral-600 h-96 font-mono text-xs"
                                        placeholder="Edit the template JSON as needed..."
                                    />
                                </div>
                             ) : (
                                projectData && (
                                    <VisualTemplateEditor
                                        data={projectData}
                                        onUpdate={handleUpdateProjectData}
                                    />
                                )
                             )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700">Cancel</Button>
                    <Button type="button" onClick={handleVerify} variant="outline" disabled={!selectedTemplateId || !templateContent}>Verify Template</Button>
                    <Button type="button" onClick={handleCreate} disabled={!isVerified} className="bg-yellow-500 hover:bg-yellow-600 text-black">Create Project</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
