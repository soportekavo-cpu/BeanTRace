import React, { useMemo } from 'react';
import { Factura, Buyer, ContractLot, Exporter, Contract } from '../types';
import LasRegionesLogo from './icons/LasRegionesLogo';
import numberToWords from '../utils/numberToWords';

interface InvoicePDFProps {
    factura: Factura;
    buyer: Buyer;
    lots: ContractLot[];
    exporter: Exporter;
    contract: Contract;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ factura, buyer, lots, exporter, contract }) => {
    
    const aggregatedData = useMemo(() => {
        if (!lots || lots.length === 0) {
            return {
                totalQqs: 0, description: '', po: 'N/A', shippedVia: 'N/A',
                terms: 'FOB', unitValue: 0,
            };
        }

        const totalBultos = lots.reduce((sum, lot) => sum + lot.bultos, 0);
        const totalNetWeight = lots.reduce((sum, lot) => sum + (lot.bultos * lot.pesoKg), 0);
        const totalQqs = lots.reduce((sum, lot) => sum + lot.pesoQqs, 0);
        
        const licenseNumber = exporter?.licenseNumber || 'N/A'; 
        const lotNumbers = lots.map(l => l.partida.split('/').pop()).join(' / ');
        
        const description = `qqs. ${totalBultos} Bags, of Guatemala Arabica Coffee, Crop 2024-2025\nTotal Net Weight: ${totalNetWeight.toFixed(2)} Kgs., 11/${licenseNumber}/${lotNumbers}`;
        
        return {
            totalQqs,
            description,
            po: contract?.contractNumber || 'N/A',
            shippedVia: lots[0]?.naviera || 'ONE LINE',
            terms: 'FOB',
            unitValue: totalQqs > 0 ? factura.totalAmount / totalQqs : 0
        };
    }, [lots, factura, contract, exporter]);

    const formatDateForInvoice = (dateString: string) => {
        if (!dateString || typeof dateString !== 'string') {
            return ''; // Return empty for null, undefined, etc.
        }
        const date = new Date(dateString + 'T12:00:00Z'); // Avoid timezone issues
        if (isNaN(date.getTime())) {
            return ''; // Return empty for invalid date strings
        }
        try {
            const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
            const formatted = new Intl.DateTimeFormat('es-ES', options).format(date);
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        } catch (e) {
            console.error("Failed to format date:", dateString, e);
            return '';
        }
    };

    const invoiceNumber = factura.facturaNumber.split('-').pop()?.replace(/^0+/, '') || 'N/A';

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', padding: '40px', backgroundColor: '#fff', width: '210mm', height: '297mm', boxSizing: 'border-box' }}>
            {/* Header */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                <tbody>
                    <tr>
                        <td style={{ verticalAlign: 'top', width: '45%', fontSize: '12px', lineHeight: '1.4' }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>DIZANO, S.A.</p>
                            <p style={{ margin: 0 }}>1a. Av. A 4-33 Granjas La Joya</p>
                            <p style={{ margin: 0 }}>Zona 8, San Miguel Petapa</p>
                            <p style={{ margin: 0 }}>Guatemala, Guatemala</p>
                            <p style={{ margin: '10px 0 0 0' }}>PBX: (502) 2319-8700</p>
                            <p style={{ margin: 0 }}>e-mail: exportaciones@cafelasregiones.gt</p>
                            <p style={{ margin: 0 }}>Nit: 8573935-9</p>
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'center' }}>
                            <LasRegionesLogo />
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap', width: '25%' }}>
                            <span style={{ color: 'red', fontWeight: 'bold', fontSize: '1.2em' }}>INVOICE NO.</span>
                            <span style={{ fontWeight: 'bold', fontSize: '1.2em', marginLeft: '10px', textDecoration: 'underline' }}>{invoiceNumber}</span>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Client Info */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', borderTop: '2px solid black', borderBottom: '2px solid black', fontSize: '12px' }}>
                <tbody>
                    <tr>
                        <td style={{ padding: '4px 0', width: '120px' }}><strong>DATE:</strong></td>
                        <td><span style={{textDecoration: 'underline'}}>{formatDateForInvoice(factura.issueDate)}</span></td>
                    </tr>
                    <tr>
                        <td style={{ padding: '4px 0' }}><strong>SOLD TO:</strong></td>
                        <td><span style={{textDecoration: 'underline'}}>{buyer?.name}</span></td>
                    </tr>
                     <tr>
                        <td style={{ padding: '4px 0', verticalAlign: 'top' }}><strong>ADDRESS:</strong></td>
                        <td><span style={{textDecoration: 'underline'}}>{buyer?.address}</span></td>
                    </tr>
                     <tr>
                        <td style={{ padding: '4px 0' }}><strong>OTHER MARK:</strong></td>
                        <td>-</td>
                    </tr>
                </tbody>
            </table>

            {/* Main Content Box */}
            <div style={{ border: '2px solid black', marginTop: '1px', fontSize: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ borderRight: '1px solid black', padding: '5px', width: '33.33%', verticalAlign: 'top' }}><strong>PO:</strong><br/>{aggregatedData.po}</td>
                            <td style={{ borderRight: '1px solid black', padding: '5px', width: '33.33%', verticalAlign: 'top' }}><strong>SHIPPED VIA:</strong><br/>{aggregatedData.shippedVia}</td>
                            <td style={{ padding: '5px', width: '33.33%', verticalAlign: 'top' }}><strong>TERMS:</strong><br/>{aggregatedData.terms}</td>
                        </tr>
                    </tbody>
                </table>
                <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid black' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#36454F', color: 'white', fontWeight: 'bold' }}>
                            <td style={{ borderRight: '1px solid black', padding: '6px', textAlign: 'center', width: '15%' }}>QUANTITY</td>
                            <td style={{ borderRight: '1px solid black', padding: '6px', textAlign: 'center', width: '45%' }}>DESCRIPTION</td>
                            <td style={{ borderRight: '1px solid black', padding: '6px', textAlign: 'center', width: '20%' }}>UNIT VALUE</td>
                            <td style={{ padding: '6px', textAlign: 'center', width: '20%' }}>AMOUNT</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ verticalAlign: 'top' }}>
                            <td style={{ borderRight: '1px solid black', padding: '8px', textAlign: 'center', height: '450px' }}>{aggregatedData.totalQqs.toFixed(2)}</td>
                            <td style={{ borderRight: '1px solid black', padding: '8px', whiteSpace: 'pre-line' }}>{aggregatedData.description}</td>
                            <td style={{ borderRight: '1px solid black', padding: '8px', textAlign: 'center' }}>${aggregatedData.unitValue.toFixed(2)}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>${factura.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', borderTop: 'none', fontSize: '12px' }}>
                <tbody>
                    <tr>
                        <td style={{ padding: '8px', width: '60%' }}>
                           {numberToWords(factura.totalAmount)}
                        </td>
                        <td style={{ padding: '8px', backgroundColor: '#36454F', color: 'white', fontWeight: 'bold', textAlign: 'center', width: '20%', borderLeft: '2px solid black' }}>
                            TOTAL
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', width: '20%', borderLeft: '1px solid black' }}>
                            ${factura.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default InvoicePDF;
