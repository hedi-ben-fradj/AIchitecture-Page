
'use client';

import { useState, useEffect } from 'react';
import { useProjectData, type EntityType, type Entity, type RoomDetail } from '@/contexts/views-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditEntityModalProps {
    isOpen: boolean;
    onClose: () => void;
    entity: Entity | null;
    onUpdate: (entityId: string, data: Partial<Entity>) => Promise<void>;
}

const roomDetailSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Room name is required"),
  size: z.coerce.number().positive("Size must be a positive number"),
});

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    entityType: z.string(),
    plotArea: z.coerce.number().optional(),
    houseArea: z.coerce.number().optional(),
    price: z.coerce.number().optional(),
    status: z.enum(['available', 'sold', 'reserved']).optional(),
    availableDate: z.string().optional(),
    floors: z.coerce.number().optional(),
    rooms: z.coerce.number().optional(),
    bedrooms: z.coerce.number().optional(),
    bathrooms: z.coerce.number().optional(),
    orientation: z.string().optional(),
    enterDetailedRoomSpecs: z.boolean().optional(),
    detailedRooms: z.array(roomDetailSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const orientations = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];

export function EditEntityModal({ isOpen, onClose, entity, onUpdate }: EditEntityModalProps) {
    const { toast } = useToast();
    const { entityTypes } = useProjectData();
    const [mismatchData, setMismatchData] = useState<FormValues | null>(null);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomSize, setNewRoomSize] = useState('');

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const { control, register, handleSubmit, formState, watch, reset } = form;
    const { isSubmitting } = formState;

    const { fields: detailedRoomFields, append: appendRoom, remove: removeRoom } = useFieldArray({
        control: control,
        name: "detailedRooms",
    });

    const entityType = watch('entityType');
    const enterDetailedRoomSpecs = watch('enterDetailedRoomSpecs');

    useEffect(() => {
        if (entity) {
            reset({
                name: entity.name,
                entityType: entity.entityType,
                plotArea: entity.plotArea ?? undefined,
                houseArea: entity.houseArea ?? undefined,
                price: entity.price ?? undefined,
                status: entity.status || 'available',
                availableDate: entity.availableDate || '',
                floors: entity.floors ?? 1,
                rooms: entity.rooms ?? 1,
                bedrooms: entity.bedrooms ?? 1,
                bathrooms: entity.bathrooms ?? 1,
                orientation: entity.orientation ?? '',
                enterDetailedRoomSpecs: !!(entity.detailedRooms && entity.detailedRooms.length > 0),
                detailedRooms: entity.detailedRooms || [],
            });
        }
        setNewRoomName('');
        setNewRoomSize('');
    }, [entity, reset]);
    
    const handleAddRoom = () => {
        if (newRoomName.trim() && newRoomSize.trim() && !isNaN(Number(newRoomSize))) {
            appendRoom({
                id: new Date().toISOString() + Math.random(),
                name: newRoomName,
                size: Number(newRoomSize),
            });
            setNewRoomName('');
            setNewRoomSize('');
        }
    };
    
    const processSave = async (data: FormValues) => {
        if (!entity) return;
        
        const rawFinalData: Partial<Entity> = { ...data };

        if (rawFinalData.entityType === 'Apartment') {
            delete (rawFinalData as any).plotArea;
        }
        if (!rawFinalData.enterDetailedRoomSpecs) {
          rawFinalData.detailedRooms = [];
        }
        
        const finalData = Object.fromEntries(
            Object.entries(rawFinalData).filter(([, value]) => value !== undefined)
        );

        await onUpdate(entity.id, finalData);

        toast({
            title: 'Entity Updated',
            description: `"${data.name}" has been saved.`,
        });
        onClose();
    };

    const onFormSubmit = (data: FormValues) => {
        if (data.enterDetailedRoomSpecs && data.detailedRooms && data.rooms !== data.detailedRooms.length) {
            setMismatchData(data);
            return;
        }
        processSave(data);
    };

    const handleConfirmMismatch = () => {
        if (!mismatchData) return;
        const correctedData = { ...mismatchData, rooms: mismatchData.detailedRooms?.length || 0 };
        processSave(correctedData);
        setMismatchData(null);
    }

    const handleIgnoreMismatch = () => {
        if (!mismatchData) return;
        processSave(mismatchData);
        setMismatchData(null);
    }
    
    if (!entity) return null;

    const handleModalClose = () => {
        setMismatchData(null);
        onClose();
    }

    return (
        <>
            <AlertDialog open={!!mismatchData} onOpenChange={(open) => !open && setMismatchData(null)}>
                <AlertDialogContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Room Count Mismatch</AlertDialogTitle>
                        <AlertDialogDescription>
                            The number of rooms you entered ({form.getValues('rooms')}) does not match the number of rooms you specified in detail ({mismatchData?.detailedRooms?.length}).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-neutral-700" onClick={() => setMismatchData(null)}>Cancel</AlertDialogCancel>
                        <Button variant="secondary" onClick={handleIgnoreMismatch}>Keep Different Room Numbers</Button>
                        <Button onClick={handleConfirmMismatch} className="bg-yellow-500 hover:bg-yellow-600 text-black">Update Overall Rooms Number</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
                <DialogContent className="sm:max-w-3xl bg-[#2a2a2a] border-neutral-700 text-white">
                    <DialogHeader>
                        <DialogTitle>Edit Entity Details</DialogTitle>
                        <DialogDescription>
                            Update the details for your entity.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onFormSubmit)}>
                        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="entity-name">Name</Label>
                                    <Input
                                        id="entity-name"
                                        {...register('name')}
                                        className="mt-2 bg-[#313131] border-neutral-600"
                                        placeholder="e.g., Apartment A-12"
                                    />
                                    {formState.errors.name && <p className="text-red-500 text-xs mt-1">{formState.errors.name.message}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="entity-type">Type</Label>
                                    <Controller
                                        control={control}
                                        name="entityType"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="mt-2 bg-[#313131] border-neutral-600">
                                                    <SelectValue placeholder="Select an entity type" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                                    {entityTypes.map(type => (
                                                        <SelectItem key={type} value={type} className="capitalize hover:bg-neutral-700">{type}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>

                            {(entityType === 'Apartment' || entityType === 'house') && (
                                <>
                                    <Separator className="bg-neutral-600" />
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="price">Price (EUR)</Label>
                                            <Input id="price" type="number" {...register('price')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="150000" />
                                        </div>
                                        <div>
                                            <Label htmlFor="status">Status</Label>
                                            <Controller
                                                control={control}
                                                name="status"
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="mt-2 bg-[#313131] border-neutral-600">
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                                            <SelectItem value="available">Available</SelectItem>
                                                            <SelectItem value="reserved">Reserved</SelectItem>
                                                            <SelectItem value="sold">Sold</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="availableDate">Available Date</Label>
                                            <Input id="availableDate" {...register('availableDate')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="e.g., 3Q/2024" />
                                        </div>
                                    </div>
                                    <div className={cn("grid gap-4", entityType === 'house' ? "grid-cols-4" : "grid-cols-3")}>
                                        {entityType === 'house' && (
                                            <div>
                                                <Label htmlFor="plotArea">Plot Area (m²)</Label>
                                                <Input id="plotArea" type="number" {...register('plotArea')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="900" />
                                            </div>
                                        )}
                                        <div>
                                            <Label htmlFor="houseArea">{entityType === 'house' ? 'House Area (m²)' : 'Area (m²)'}</Label>
                                            <Input id="houseArea" type="number" {...register('houseArea')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="150" />
                                        </div>
                                        <div>
                                            <Label htmlFor="floors">Floors</Label>
                                            <Input id="floors" type="number" {...register('floors')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="1" />
                                        </div>
                                        <div>
                                            <Label htmlFor="rooms">Total Rooms</Label>
                                            <Input id="rooms" type="number" {...register('rooms')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="3" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="bedrooms">Bedrooms</Label>
                                            <Input id="bedrooms" type="number" {...register('bedrooms')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="2" />
                                        </div>
                                        <div>
                                            <Label htmlFor="bathrooms">Bathrooms</Label>
                                            <Input id="bathrooms" type="number" {...register('bathrooms')} className="mt-2 bg-[#313131] border-neutral-600" placeholder="1" />
                                        </div>
                                        <div>
                                            <Label htmlFor="orientation">Orientation</Label>
                                            <Controller
                                                control={control}
                                                name="orientation"
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="mt-2 bg-[#313131] border-neutral-600">
                                                            <SelectValue placeholder="Select orientation" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                                                            {orientations.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    </div>
                                    <Separator className="bg-neutral-600" />
                                    <div className="flex items-center space-x-2">
                                        <Controller
                                            control={control}
                                            name="enterDetailedRoomSpecs"
                                            render={({ field }) => (
                                                <Checkbox
                                                    id="enterDetailedRoomSpecs"
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            )}
                                        />
                                        <label
                                            htmlFor="enterDetailedRoomSpecs"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Enter detailed room specifications
                                        </label>
                                    </div>
                                    
                                    {enterDetailedRoomSpecs && (
                                        <div className="space-y-4 p-4 border border-neutral-600 rounded-md">
                                            <div className="grid grid-cols-12 gap-2 items-end">
                                                <div className="col-span-5">
                                                    <Label>Room Name</Label>
                                                    <Input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} className="mt-2 bg-[#313131] border-neutral-600" placeholder="e.g. Living Room"/>
                                                </div>
                                                <div className="col-span-4">
                                                    <Label>Size (m²)</Label>
                                                    <Input value={newRoomSize} onChange={e => setNewRoomSize(e.target.value)} type="number" className="mt-2 bg-[#313131] border-neutral-600" placeholder="25"/>
                                                </div>
                                                <div className="col-span-3">
                                                     <Button type="button" onClick={handleAddRoom} disabled={!newRoomName.trim() || !newRoomSize.trim()} className="w-full">Add Room</Button>
                                                </div>
                                            </div>

                                            {detailedRoomFields.length > 0 && (
                                                <div className="space-y-2">
                                                    {detailedRoomFields.map((field, index) => (
                                                        <div key={field.id} className="flex items-center justify-between p-2 bg-neutral-700/50 rounded-md">
                                                            <div className="flex items-center gap-4">
                                                                <span className="font-medium">{field.name}</span>
                                                                <span className="text-sm text-neutral-400">{field.size} m²</span>
                                                            </div>
                                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => removeRoom(index)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </>
                            )}
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="ghost" onClick={handleModalClose} className="hover:bg-neutral-700">Cancel</Button>
                            <Button type="submit" loading={isSubmitting} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
