import React from 'react';
import TraceabilityChat from '../components/TraceabilityChat';

const TrazabilidadPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-2xl font-bold text-foreground">Asistente de Trazabilidad</h2>
                <p className="text-muted-foreground mt-1">
                    Pregunta sobre el ciclo de vida de cualquier producto en lenguaje natural.
                </p>
            </div>
            
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <TraceabilityChat />
            </div>
        </div>
    );
};

export default TrazabilidadPage;