import React, { useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import { ToastMessage } from '../contexts/ToastContext';
import XIcon from './icons/XIcon';

const Toast: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, 5000); // Auto-dismiss after 5 seconds

        return () => {
            clearTimeout(timer);
        };
    }, [toast, onRemove]);

    const baseClasses = "flex items-start p-4 mb-4 text-sm rounded-lg shadow-lg w-full max-w-sm animate-fade-in-right";
    const typeClasses = {
        success: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
        error: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
        warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
        info: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    };

    return (
        <div className={`${baseClasses} ${typeClasses[toast.type]}`} role="alert">
            <div className="flex-grow">{toast.message}</div>
            <button
                onClick={() => onRemove(toast.id)}
                className="-mx-1.5 -my-1.5 ml-2 p-1.5 rounded-lg inline-flex h-8 w-8 hover:bg-white/20"
                aria-label="Close"
            >
                <XIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-5 right-5 z-[100] w-full max-w-sm">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    );
};
