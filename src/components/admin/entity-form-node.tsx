
'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useProjectData } from '@/contexts/views-context';
import { Card, CardContent } from '@/components/ui/card';

export function EntityFormNode({ entity, onUpdate, onDelete }: { entity: any, onUpdate: (entity: any) => void, onDelete: () => void }) {
    const { entityTypes } = useProjectData();

    // Find the correctly cased entity type from the list to ensure the Select works case-insensitively
    const currentEntityType = entityTypes.find(et => et.toLowerCase() === (entity.entityType || '').toLowerCase()) || entity.entityType;

    const handleFieldChange = (field: string, value: string) => {
        onUpdate({ ...entity, [field]: value });
    };

    const handleChildUpdate = (index: number, updatedChild: any) => {
        const newChildren = [...(entity.childEntities || [])];
        newChildren[index] = updatedChild;
        onUpdate({ ...entity, childEntities: newChildren });
    };

    const handleChildDelete = (index: number) => {
        const newChildren = (entity.childEntities || []).filter((_: any, i: number) => i !== index);
        onUpdate({ ...entity, childEntities: newChildren });
    };

    const addChildEntity = () => {
        const newChild = {
            entityName: '<New Child Entity>',
            entityType: entityTypes[0] || 'Apartment',
            entityDescription: '<Description>',
            childEntities: []
        };
        const newChildren = [...(entity.childEntities || []), newChild];
        onUpdate({ ...entity, childEntities: newChildren });
    };

    return (
        <Card className="bg-neutral-800/50 border-neutral-700 text-white">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="flex-grow space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-neutral-300 block mb-2">Name</label>
                                <Input 
                                    value={entity.entityName} 
                                    onChange={(e) => handleFieldChange('entityName', e.target.value)} 
                                    className="bg-[#313131] border-neutral-600" 
                                    placeholder="<Entity Name>"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-neutral-300 block mb-2">Type</label>
                                <Select value={currentEntityType} onValueChange={(value) => handleFieldChange('entityType', value)}>
                                    <SelectTrigger className="bg-[#313131] border-neutral-600">
                                        <SelectValue placeholder="<Select Type>" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                        {entityTypes.map(type => <SelectItem key={type} value={type} className="hover:bg-neutral-700 capitalize">{type}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-neutral-300 block mb-2">Description (Optional)</label>
                            <Textarea 
                                value={entity.entityDescription || ''} 
                                onChange={(e) => handleFieldChange('entityDescription', e.target.value)} 
                                rows={2} 
                                className="bg-[#313131] border-neutral-600"
                                placeholder="<Entity Description>"
                            />
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="mt-8 text-red-500 hover:text-red-400 flex-shrink-0">
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="space-y-4">
                    <div className="pl-4 border-l-2 border-neutral-700 space-y-4">
                         {entity.childEntities && entity.childEntities.length > 0 && (
                            <div className="pt-2">
                                <label className="text-base font-semibold text-neutral-200 block mb-4">Child Entities</label>
                                <div className="space-y-4">
                                    {entity.childEntities.map((child: any, index: number) => (
                                        <EntityFormNode
                                            key={index}
                                            entity={child}
                                            onUpdate={(updatedChild) => handleChildUpdate(index, updatedChild)}
                                            onDelete={() => handleChildDelete(index)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="pl-6">
                        <Button type="button" variant="secondary" onClick={addChildEntity} className="bg-neutral-600 hover:bg-neutral-500 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Add Child
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
