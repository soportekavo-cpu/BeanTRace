import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PrintManagerProps {
    children: React.ReactElement;
    onFinished: () => void;
}

const PrintManager: React.FC<PrintManagerProps> = ({ children, onFinished }) => {
    useEffect(() => {
        const handleAfterPrint = () => {
            onFinished();
            window.removeEventListener('afterprint', handleAfterPrint);
        };
        window.addEventListener('afterprint', handleAfterPrint);
        
        // This slight delay helps ensure content is fully rendered before print dialog appears
        const timer = setTimeout(() => {
            window.print();
        }, 50);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, [onFinished]);

    const printRootEl = document.getElementById('print-area');
    if (!printRootEl) {
        console.error("Print root element #print-area not found.");
        return null;
    }
    
    // Show the print area during the print job
    printRootEl.style.display = 'block';

    // The onFinished callback will be triggered by handleAfterPrint,
    // and we can hide the print area again in the parent component if needed.
    // For now, let the CSS handle it.
    
    return createPortal(children, printRootEl);
};

export default PrintManager;
