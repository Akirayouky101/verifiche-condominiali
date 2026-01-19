import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface LavorazioneFiltriProps {
  ricerca: string;
  tipoSelezionato: string;
  statoSelezionato: string;
  onRicercaChange: (valore: string) => void;
  onTipoChange: (tipo: string) => void;
  onStatoChange: (stato: string) => void;
  onReload?: () => void;
}

export function LavorazioneFiltri({
  ricerca,
  tipoSelezionato,
  statoSelezionato,
  onRicercaChange,
  onTipoChange,
  onStatoChange,
  onReload,
}: LavorazioneFiltriProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ricerca */}
        <div>
          <label htmlFor="ricerca-condominio" className="block text-sm font-medium text-gray-700 mb-2">
            Cerca Condominio
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="ricerca-condominio"
              type="text"
              value={ricerca}
              onChange={(e) => onRicercaChange(e.target.value)}
              placeholder="Cerca per nome condominio..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Tipo */}
        <div>
          <label htmlFor="filtro-tipo" className="block text-sm font-medium text-gray-700 mb-2">
            Tipo Lavorazione
          </label>
          <select
            id="filtro-tipo"
            value={tipoSelezionato}
            onChange={(e) => onTipoChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="tutti">Tutti i tipi</option>
            <option value="tutte">Tutte</option>
            <option value="lavorazioni">Solo Lavorazioni</option>
            <option value="integrazioni">Solo Integrazioni</option>
            <option value="ordinaria">Ordinaria</option>
            <option value="straordinaria">Straordinaria</option>
            <option value="manutenzione">Manutenzione</option>
          </select>
        </div>

        {/* Stato */}
        <div>
          <label htmlFor="filtro-stato" className="block text-sm font-medium text-gray-700 mb-2">
            Stato
          </label>
          <select
            id="filtro-stato"
            value={statoSelezionato}
            onChange={(e) => onStatoChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="tutti">Tutti gli stati</option>
            <option value="tutte">Tutti</option>
            <option value="assegnata">Assegnate</option>
            <option value="da_eseguire">Da Eseguire</option>
            <option value="in_corso">In Corso</option>
            <option value="completata">Completata</option>
            <option value="riaperta">Riaperta</option>
          </select>
        </div>

        {/* Bottone ricarica */}
        {onReload && (
          <div className="flex items-end">
            <button
              onClick={onReload}
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <span>🔄</span>
              Ricarica
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
