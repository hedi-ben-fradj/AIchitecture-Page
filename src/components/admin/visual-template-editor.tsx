
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EntityFormNode } from './entity-form-node';
import { useProjectData } from '@/contexts/views-context';
import { Separator } from '../ui/separator';

export function VisualTemplateEditor({ data, onUpdate }: { data: any, onUpdate: (data: any) => void }) {
    const { entityTypes } = useProjectData();

    const handleProjectDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onUpdate({ ...data, [e.target.name]: e.target.value });
    };

    const handleEntitiesChange = (newEntities: any[]) => {
        onUpdate({ ...data, projectEntities: newEntities });
    };

    const addRootEntity = () => {
        const newEntity = {
            entityName: 'New Entity',
            entityType: entityTypes[0] || 'Apartment',
            entityDescription: '',
            childEntities: []
        };
        handleEntitiesChange([...(data.projectEntities || []), newEntity]);
    };

    return (
        <div className="space-y-4 text-white">
            <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input name="projectName" value={data.projectName} onChange={handleProjectDetailChange} className="bg-[#313131] border-neutral-600" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="projectDescription">Project Description</Label>
                <Textarea name="projectDescription" value={data.projectDescription} onChange={handleProjectDetailChange} className="bg-[#313131] border-neutral-600" />
            </div>
            
            <Separator className="bg-neutral-600 my-4" />
            
            <div className="space-y-3">
                <Label className="text-lg font-semibold">Entities</Label>
                <div className="space-y-4">
                    {data.projectEntities?.map((entity: any, index: number) => (
                        <EntityFormNode
                            key={index} // Note: Using index as key is okay here because we are not re-ordering
                            entity={entity}
                            onUpdate={(updatedEntity) => {
                                const newEntities = [...data.projectEntities];
                                newEntities[index] = updatedEntity;
                                handleEntitiesChange(newEntities);
                            }}
                            onDelete={() => {
                                const newEntities = data.projectEntities.filter((_: any, i: number) => i !== index);
                                handleEntitiesChange(newEntities);
                            }}
                        />
                    ))}
                </div>
                <Button type="button" variant="outline" onClick={addRootEntity} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" /> Add Root Entity
                </Button>
            </div>
        </div>
    );
}
