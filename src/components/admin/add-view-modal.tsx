'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useViews } from '@/contexts/views-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddViewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddViewModal({ isOpen, onClose }: AddViewModalProps) {
    const [viewName, setViewName] = useState('');
    const { addView } = useViews();
    const router = useRouter();

    const handleCreate = () => {
        if (!viewName.trim()) {
            // Basic validation
            return;
        }
        const newViewHref = addView(viewName);
        onClose();
        setViewName('');
        router.push(newViewHref);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#2a2a2a] border-neutral-700 text-white">
                <DialogHeader>
                    <DialogTitle>Add New View</DialogTitle>
                    <DialogDescription>Enter a name for your new view. You can change this later.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="view-name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="view-name"
                            value={viewName}
                            onChange={(e) => setViewName(e.target.value)}
                            className="col-span-3 bg-[#313131] border-neutral-600"
                            placeholder="e.g., Rooftop Terrace"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-neutral-700">Cancel</Button>
                    <Button type="submit" onClick={handleCreate} disabled={!viewName.trim()} className="bg-yellow-500 hover:bg-yellow-600 text-black">Create View</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
