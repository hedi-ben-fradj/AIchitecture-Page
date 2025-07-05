
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

    const handleFieldChange = (field: string, value: string) => {
        onUpdate({ ...entity, [field]: value });
    };

    const handleChildUpdate = (index: number, updatedChild: any) => {
        const newChildren = [...entity.childEntities];
        newChildren[index] = updatedChild;
        onUpdate({ ...entity, childEntities: newChildren });
    };

    const handleChildDelete = (index: number) => {
        const newChildren = entity.childEntities.filter((_: any, i: number) => i !== index);
        onUpdate({ ...entity, childEntities: newChildren });
    };

    const addChildEntity = () => {
        const newChild = {
            entityName: 'New Child Entity',
            entityType: entityTypes[0] || 'Apartment',
            entityDescription: '',
            childEntities: []
        };
        const newChildren = [...(entity.childEntities || []), newChild];
        onUpdate({ ...entity, childEntities: newChildren });
    };

    return (
        <Card className="bg-neutral-800/50 border-neutral-700 text-white">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div className="grid grid-cols-2 gap-3 flex-grow">
                        <div>
                            <label className="text-xs text-neutral-400">Name</label>
                            <Input value={entity.entityName} onChange={(e) => handleFieldChange('entityName', e.target.value)} className="bg-[#313131] border-neutral-600 mt-1" />
                        </div>
                        <div>
                            <label className="text-xs text-neutral-400">Type</label>
                            <Select value={entity.entityType} onValueChange={(value) => handleFieldChange('entityType', value)}>
                                <SelectTrigger className="bg-[#313131] border-neutral-600 mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                    {entityTypes.map(type => <SelectItem key={type} value={type} className="hover:bg-neutral-700 capitalize">{type}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2">
                             <label className="text-xs text-neutral-400">Description (Optional)</label>
                            <Textarea value={entity.entityDescription || ''} onChange={(e) => handleFieldChange('entityDescription', e.target.value)} rows={2} className="bg-[#313131] border-neutral-600 mt-1" />
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="ml-2 mt-4 text-red-500 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                
                {entity.childEntities && entity.childEntities.length > 0 && (
                    <div className="pl-4 pt-3 border-l-2 border-neutral-600 space-y-3">
                        <label className="text-sm font-medium text-neutral-300">Child Entities</label>
                        {entity.childEntities.map((child: any, index: number) => (
                            <EntityFormNode
                                key={index}
                                entity={child}
                                onUpdate={(updatedChild) => handleChildUpdate(index, updatedChild)}
                                onDelete={() => handleChildDelete(index)}
                            />
                        ))}
                    </div>
                )}
                 <Button type="button" variant="secondary" onClick={addChildEntity} className="bg-neutral-600 hover:bg-neutral-500 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Add Child
                </Button>
            </CardContent>
        </Card>
    );
}
