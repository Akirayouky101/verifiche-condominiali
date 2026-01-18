import React from 'react';

interface LavorazioneStatsProps {
  stats: {
    totali: number;
    da_eseguire: number;
    in_corso: number;
    completata: number;
    riaperte: number;
  };
}

export function LavorazioneStats({ stats }: LavorazioneStatsProps) {
  const cards = [
    { label: 'Totali', value: stats.totali, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { label: 'Da Eseguire', value: stats.da_eseguire, color: 'bg-gray-100 text-gray-800 border-gray-300' },
    { label: 'In Corso', value: stats.in_corso, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { label: 'Completate', value: stats.completata, color: 'bg-green-100 text-green-800 border-green-300' },
    { label: 'Riaperte', value: stats.riaperte, color: 'bg-red-100 text-red-800 border-red-300' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`p-4 rounded-lg border-2 ${card.color} text-center`}
        >
          <div className="text-3xl font-bold mb-1">{card.value}</div>
          <div className="text-sm font-medium">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
