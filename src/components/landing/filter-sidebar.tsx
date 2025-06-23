'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export interface Filters {
    minWidth?: number | '';
    maxWidth?: number | '';
    minHeight?: number | '';
    maxHeight?: number | '';
}

interface FilterSidebarProps {
    onApplyFilters: (filters: Filters) => void;
    onResetFilters: () => void;
}

export default function FilterSidebar({ onApplyFilters, onResetFilters }: FilterSidebarProps) {
    const [filters, setFilters] = useState<Filters>({
        minWidth: '',
        maxWidth: '',
        minHeight: '',
        maxHeight: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    };

    const handleApply = () => {
        onApplyFilters(filters);
    };

    const handleReset = () => {
        const resetFiltersState = {
            minWidth: '',
            maxWidth: '',
            minHeight: '',
            maxHeight: '',
        };
        setFilters(resetFiltersState);
        onResetFilters();
    };

    return (
        <Card className="bg-black/70 backdrop-blur-sm text-white border-none h-full flex flex-col rounded-none">
            <CardHeader className="p-4 border-b border-neutral-700">
                <CardTitle className="text-lg font-semibold">Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-6 overflow-y-auto p-4">
                <div>
                    <h4 className="font-semibold mb-2 text-neutral-300">Width (m)</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="minWidth" className="text-xs text-neutral-400">Min</Label>
                            <Input
                                id="minWidth"
                                name="minWidth"
                                type="number"
                                placeholder="0"
                                value={filters.minWidth}
                                onChange={handleInputChange}
                                className="bg-neutral-800 border-neutral-600 h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="maxWidth" className="text-xs text-neutral-400">Max</Label>
                            <Input
                                id="maxWidth"
                                name="maxWidth"
                                type="number"
                                placeholder="Any"
                                value={filters.maxWidth}
                                onChange={handleInputChange}
                                className="bg-neutral-800 border-neutral-600 h-9"
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-2 text-neutral-300">Height (m)</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="minHeight" className="text-xs text-neutral-400">Min</Label>
                            <Input
                                id="minHeight"
                                name="minHeight"
                                type="number"
                                placeholder="0"
                                value={filters.minHeight}
                                onChange={handleInputChange}
                                className="bg-neutral-800 border-neutral-600 h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="maxHeight" className="text-xs text-neutral-400">Max</Label>
                            <Input
                                id="maxHeight"
                                name="maxHeight"
                                type="number"
                                placeholder="Any"
                                value={filters.maxHeight}
                                onChange={handleInputChange}
                                className="bg-neutral-800 border-neutral-600 h-9"
                            />
                        </div>
                    </div>
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
