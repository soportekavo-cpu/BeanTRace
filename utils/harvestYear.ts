import { Contract } from '../types';

export const getCurrentHarvestYear = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11, October is 9
    if (month >= 9) { // October or later
        return `${year}/${year + 1}`;
    } else {
        return `${year - 1}/${year}`;
    }
};

export const getHarvestYears = (contracts: Contract[]): string[] => {
    const currentHarvestYear = getCurrentHarvestYear();
    const years = new Set<string>([currentHarvestYear]);
    
    contracts.forEach(c => {
        if (c.añoCosecha) {
            years.add(c.añoCosecha);
        }
    });

    const [start] = currentHarvestYear.split('/').map(Number);
    // Add the next two future years for planning
    years.add(`${start + 1}/${start + 2}`);
    years.add(`${start + 2}/${start + 3}`);

    return Array.from(years).sort((a, b) => b.localeCompare(a));
};
