import React from 'react';
import ReactDOMServer from 'react-dom/server';

export const printComponent = (component: React.ReactElement, title: string) => {
    const printContent = ReactDOMServer.renderToString(component);
    
    // Get styles from the main document
    const tailwindScript = document.querySelector('script:nth-of-type(1)'); // The tailwind config script
    const tailwindStyle = document.querySelector('style'); // The generated styles
    
    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            ${tailwindScript?.outerHTML || ''}
            ${tailwindStyle?.outerHTML || ''}
            <style>
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            ${printContent}
        </body>
        </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // 1. Open in new tab
    window.open(url, '_blank');

    // 2. Open print dialog
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;

    iframe.onload = () => {
        setTimeout(() => {
            if (iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }
            // Clean up after a delay, to ensure print dialog is processed
            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(iframe);
            }, 1000);
        }, 100); // Small delay to ensure content is fully loaded
    };

    document.body.appendChild(iframe);
};
