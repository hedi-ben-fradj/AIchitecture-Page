
'use client';

import { useState } from 'react';
import { useProjectData, type EntityType } from '@/contexts/views-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddEntityModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentId?: string | null;
}

export function AddEntityModal({ isOpen, onClose, parentId = null }: AddEntityModalProps) {
    const [entityName, setEntityName] = useState('');
    const { addEntity, entityTypes } = useProjectData();
    const [entityType, setEntityType] = useState<EntityType>(entityTypes.includes('Apartment') ? 'Apartment' : entityTypes[0]);

    const handleCreate = () => {
        if (!entityName.trim()) {
            return;
        }
        addEntity(entityName, entityType, parentId);
        onClose();
        setEntityName('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>{parentId ? 'Add New Child Entity' : 'Add New Top-Level Entity'}</DialogTitle>
                    <DialogDescription>
                        {parentId 
                            ? "Enter details for your new child entity. This will be nested under the current entity."
                            : "Enter details for your new top-level entity. You can change this later."
                        }
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
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="entity-type" className="text-right">
                            Type
                        </Label>
                        <Select onValueChange={(value) => setEntityType(value as EntityType)} defaultValue={entityType}>
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
                    <Button type="submit" onClick={handleCreate} disabled={!entityName.trim()} className="bg-yellow-500 hover:bg-yellow-600 text-black">Create Entity</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
