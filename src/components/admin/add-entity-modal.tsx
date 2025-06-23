'use client';

import { useState } from 'react';
import { useProjectData } from '@/contexts/views-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddEntityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddEntityModal({ isOpen, onClose }: AddEntityModalProps) {
    const [entityName, setEntityName] = useState('');
    const { addEntity } = useProjectData();

    const handleCreate = () => {
        if (!entityName.trim()) {
            return;
        }
        addEntity(entityName);
        onClose();
        setEntityName('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>Add New Entity</DialogTitle>
                    <DialogDescription>Enter a name for your new entity. You can change this later.</DialogDescription>
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
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700">Cancel</Button>
                    <Button type="submit" onClick={handleCreate} disabled={!entityName.trim()} className="bg-yellow-500 hover:bg-yellow-600 text-black">Create Entity</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
