import React from 'react';

export const formatNumber = (value: number | string | undefined | null): string => {
    const num = Number(value);
    if (isNaN(num)) {
        return '0.00';
    }
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
