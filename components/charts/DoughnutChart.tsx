import React from 'react';

interface DoughnutChartProps {
    data: { label: string; value: number; color: string }[];
    onSegmentClick: (label: string) => void;
}

const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
};

const DoughnutChart: React.FC<DoughnutChartProps> = ({ data, onSegmentClick }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;

    let cumulativePercent = 0;
    const innerRadius = 0.6;

    return (
        <svg viewBox="-1.2 -1.2 2.4 2.4" style={{ transform: 'rotate(-90deg)' }}>
            {data.map(item => {
                const percent = item.value / total;
                const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                cumulativePercent += percent;
                const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                const largeArcFlag = percent > 0.5 ? 1 : 0;
                
                const [innerStartX, innerStartY] = [startX * innerRadius, startY * innerRadius];
                const [innerEndX, innerEndY] = [endX * innerRadius, endY * innerRadius];
                
                const pathData = [
                    `M ${startX} ${startY}`,
                    `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                    `L ${innerEndX} ${innerEndY}`,
                    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}`,
                    `Z`
                ].join(' ');

                return (
                    <path
                        key={item.label}
                        d={pathData}
                        fill={item.color}
                        onClick={() => onSegmentClick(item.label)}
                        className="transition-opacity duration-300 hover:opacity-80"
                        style={{ cursor: 'pointer' }}
                    >
                        <title>{`${item.label}: ${item.value.toFixed(2)}`}</title>
                    </path>
                );
            })}
        </svg>
    );
};

export default DoughnutChart;