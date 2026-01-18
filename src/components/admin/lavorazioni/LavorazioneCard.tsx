import React from 'react';
import { Lavorazione } from '@/lib/types';
import { formatDate, getStatoInfo, getPrioritaInfo, getTipologiaFromAllegati } from '@/lib/lavorazioneUtils';
import { 
  CheckCircleIcon, 
  ArrowPathIcon, 
  TrashIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface LavorazioneCardProps {
  lavorazione: Lavorazione;
  onCompleta: (id: number) => void;
  onRiapri: (id: number) => void;
  onElimina: (id: number) => void;
}

export function LavorazioneCard({
  lavorazione,
  onCompleta,
  onRiapri,
  onElimina,
}: LavorazioneCardProps) {
  const statoInfo = getStatoInfo(lavorazione.stato);
  const prioritaInfo = getPrioritaInfo(lavorazione.priorita);
  const tipologia = getTipologiaFromAllegati(lavorazione.allegati);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {lavorazione.condomini?.nome || 'Condominio non specificato'}
          </h3>
          <p className="text-sm text-gray-600">{lavorazione.titolo}</p>
        </div>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statoInfo.color}`}>
            {statoInfo.label}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${prioritaInfo.color}`}>
            {prioritaInfo.label}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center text-gray-600">
          <UserIcon className="h-4 w-4 mr-2" />
          <span>{lavorazione.users?.username || 'Non assegnato'}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <ClockIcon className="h-4 w-4 mr-2" />
          <span>{formatDate(lavorazione.data_apertura)}</span>
        </div>
        <div className="text-gray-600">
          <span className="font-medium">Tipologia:</span> {tipologia}
        </div>
        {lavorazione.data_scadenza && (
          <div className="text-gray-600">
            <span className="font-medium">Scadenza:</span> {formatDate(lavorazione.data_scadenza)}
          </div>
        )}
      </div>

      {/* Descrizione */}
      {lavorazione.descrizione && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
          {lavorazione.descrizione}
        </p>
      )}

      {/* Note riapertura */}
      {lavorazione.stato === 'riaperta' && lavorazione.motivo_riapertura && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            <span className="font-semibold">Motivo riapertura:</span> {lavorazione.motivo_riapertura}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        {lavorazione.stato !== 'completata' && (
          <button
            onClick={() => onCompleta(Number(lavorazione.id))}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Completa
          </button>
        )}
        
        {lavorazione.stato === 'completata' && (
          <button
            onClick={() => onRiapri(Number(lavorazione.id))}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Riapri
          </button>
        )}

        <button
          onClick={() => onElimina(Number(lavorazione.id))}
          title="Elimina lavorazione"
          className="px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
