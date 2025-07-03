
'use client';

import { useState, useEffect } from 'react';
import { useProjectData, entityTypes, type EntityType, type Entity } from '@/contexts/views-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';


interface EditEntityModalProps {
    isOpen: boolean;
    onClose: () => void;
    entity: Entity | null;
}

export function EditEntityModal({ isOpen, onClose, entity }: EditEntityModalProps) {
    const [entityName, setEntityName] = useState('');
    const [entityType, setEntityType] = useState<EntityType | undefined>(undefined);
    const { updateEntity } = useProjectData();
    const { toast } = useToast();

    useEffect(() => {
        if (entity) {
            setEntityName(entity.name);
            setEntityType(entity.entityType);
        }
    }, [entity]);


    const handleSave = () => {
        if (!entity || !entityName.trim() || !entityType) {
            return;
        }
        updateEntity(entity.id, { name: entityName, entityType });
        toast({
            title: 'Entity Updated',
            description: `"${entityName}" has been saved.`,
        });
        onClose();
    };
    
    if (!entity) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Entity Details</DialogTitle>
                    <DialogDescription>
                        Update the name and type for your entity.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="entity-name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="entity-name"
                            value={entityName}
                            onChange={(e) => setEntityName(e.target.value)}
                            className="col-span-3 bg-[#313131] border-neutral-600"
                            placeholder="e.g., Apartment A-12"
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="entity-type" className="text-right">
                            Type
                        </Label>
                        <Select onValueChange={(value) => setEntityType(value as EntityType)} value={entityType}>
                            <SelectTrigger className="col-span-3 bg-[#313131] border-neutral-600">
                                <SelectValue placeholder="Select an entity type" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                {entityTypes.map(type => (
                                    <SelectItem key={type} value={type} className="capitalize hover:bg-neutral-700">{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700">Cancel</Button>
                    <Button type="submit" onClick={handleSave} disabled={!entityName.trim() || !entityType} className="bg-yellow-500 hover:bg-yellow-600 text-black">Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
