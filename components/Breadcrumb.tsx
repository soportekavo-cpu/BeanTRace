import React from 'react';
import { Page } from '../pages/DashboardLayout';

export interface BreadcrumbItem {
    label: string;
    page?: Page;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    onClick: (page?: Page) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, onClick }) => {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <nav aria-label="breadcrumb" className="flex items-center text-sm font-medium text-muted-foreground">
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <span className="mx-2 select-none">/</span>}
                    {item.page && index < items.length - 1 ? (
                        <button onClick={() => onClick(item.page)} className="hover:text-foreground transition-colors">
                            {item.label}
                        </button>
                    ) : (
                        <span className="text-foreground font-semibold">{item.label}</span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumb;
