'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface Filters {
    minArea?: number | '';
    maxArea?: number | '';
    minPrice?: number | '';
    maxPrice?: number | '';
    availability?: 'all' | 'available' | 'sold';
    minRooms?: number | '';
    maxRooms?: number | '';
}

interface FilterSidebarProps {
    onApplyFilters: (filters: Filters) => void;
    onResetFilters: () => void;
}

const defaultFilters: Filters = {
    minArea: '',
    maxArea: '',
    minPrice: '',
    maxPrice: '',
    availability: 'all',
    minRooms: '',
    maxRooms: '',
};

export default function FilterSidebar({ onApplyFilters, onResetFilters }: FilterSidebarProps) {
    const [filters, setFilters] = useState<Filters>(defaultFilters);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    };

    const handleRadioChange = (value: Filters['availability']) => {
        setFilters(prev => ({ ...prev, availability: value }));
    };

    const handleApply = () => {
        onApplyFilters(filters);
    };

    const handleReset = () => {
        setFilters(defaultFilters);
        onResetFilters();
    };

    return (
        <Card className="bg-black/70 backdrop-blur-sm text-white border-none h-full flex flex-col rounded-none">
            <CardHeader className="p-4 border-b border-neutral-700">
                <CardTitle className="text-lg font-semibold">Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-6 overflow-y-auto p-4">
                <div>
                    <h4 className="font-semibold mb-2 text-neutral-300">Price (EUR)</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="minPrice" className="text-xs text-neutral-400">Min</Label>
                            <Input
                                id="minPrice"
                                name="minPrice"
                                type="number"
                                placeholder="Any"
                                value={filters.minPrice}
                                onChange={handleInputChange}
                                className="bg-neutral-800 border-neutral-600 h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="maxPrice" className="text-xs text-neutral-400">Max</Label>
                            <Input
                                id="maxPrice"
                                name="maxPrice"
                                type="number"
                                placeholder="Any"
                                value={filters.maxPrice}
                                onChange={handleInputChange}
                                className="bg-neutral-800 border-neutral-600 h-9"
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-2 text-neutral-300">Area (m²)</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="minArea" className="text-xs text-neutral-400">Min</Label>
                            <Input
                                id="minArea"
                                name="minArea"
                                type="number"
                                placeholder="Any"
                                value={filters.minArea}
                                onChange={handleInputChange}
                                className="bg-neutral-800 border-neutral-600 h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="maxArea" className="text-xs text-neutral-400">Max</Label>
                            <Input
                                id="maxArea"
                                name="maxArea"
                                type="number"
                                placeholder="Any"
                                value={filters.maxArea}
                                onChange={handleInputChange}
                                className="bg-neutral-800 border-neutral-600 h-9"
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-2 text-neutral-300">Rooms</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="minRooms" className="text-xs text-neutral-400">Min</Label>
                            <Input
                                id="minRooms"
                                name="minRooms"
                                type="number"
                                placeholder="Any"
                                value={filters.minRooms}
                                onChange={handleInputChange}
                                className="bg-neutral-800 border-neutral-600 h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="maxRooms" className="text-xs text-neutral-400">Max</Label>
                            <Input
                                id="maxRooms"
                                name="maxRooms"
                                type="number"
                                placeholder="Any"
                                value={filters.maxRooms}
                                onChange={handleInputChange}
                                className="bg-neutral-800 border-neutral-600 h-9"
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-2 text-neutral-300">Availability</h4>
                    <RadioGroup
                        value={filters.availability}
                        onValueChange={handleRadioChange as any}
                        className="space-y-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="r-all" />
                            <Label htmlFor="r-all">All</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="available" id="r-available" />
                            <Label htmlFor="r-available">Available</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sold" id="r-sold" />
                            <Label htmlFor="r-sold">Sold</Label>
                        </div>
                    </RadioGroup>
                </div>
            </CardContent>
            <CardFooter className="p-4 border-t border-neutral-700 flex-col space-y-2">
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black" onClick={handleApply}>
                    Apply Filters
                </Button>
                <Button variant="outline" className="w-full hover:bg-neutral-700" onClick={handleReset}>
                    Reset Filters
                </Button>
            </CardFooter>
        </Card>
    );
}
