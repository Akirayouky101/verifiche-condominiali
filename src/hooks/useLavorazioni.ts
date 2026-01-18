import { useState, useEffect, useCallback, useMemo } from 'react';
import { Lavorazione } from '@/lib/types';

interface UseLavorazioniReturn {
  lavorazioni: Lavorazione[];
  lavorazioniFiltrate: Lavorazione[];
  loading: boolean;
  error: string | null;
  stats: {
    totali: number;
    da_eseguire: number;
    in_corso: number;
    completata: number;
    riaperte: number;
  };
  filtri: {
    ricerca: string;
    tipoSelezionato: string;
    statoSelezionato: string;
  };
  paginazione: {
    paginaCorrente: number;
    elementiPerPagina: number;
    totalePagine: number;
  };
  lavorazioniPaginate: Lavorazione[];
  setRicerca: (valore: string) => void;
  setTipoSelezionato: (tipo: string) => void;
  setStatoSelezionato: (stato: string) => void;
  setPaginaCorrente: (pagina: number) => void;
  setElementiPerPagina: (elementi: number) => void;
  caricaLavorazioni: () => Promise<void>;
}

export function useLavorazioni(): UseLavorazioniReturn {
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtri
  const [ricerca, setRicerca] = useState('');
  const [tipoSelezionato, setTipoSelezionato] = useState('tutti');
  const [statoSelezionato, setStatoSelezionato] = useState('tutti');

  // Paginazione
  const [paginaCorrente, setPaginaCorrente] = useState(1);
  const [elementiPerPagina, setElementiPerPagina] = useState(10);

  const caricaLavorazioni = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/lavorazioni');
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle lavorazioni');
      }
      
      const data = await response.json();
      setLavorazioni(data);
    } catch (err) {
      console.error('Errore caricamento lavorazioni:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    caricaLavorazioni();
  }, [caricaLavorazioni]);

  // Calcolo statistiche
  const stats = useMemo(() => ({
    totali: lavorazioni.length,
    da_eseguire: lavorazioni.filter(l => l.stato === 'da_eseguire').length,
    in_corso: lavorazioni.filter(l => l.stato === 'in_corso').length,
    completata: lavorazioni.filter(l => l.stato === 'completata').length,
    riaperte: lavorazioni.filter(l => l.stato === 'riaperta').length,
  }), [lavorazioni]);

  // Filtraggio lavorazioni
  const lavorazioniFiltrate = useMemo(() => {
    return lavorazioni.filter(lav => {
      const matchRicerca = !ricerca || 
        lav.condomini?.nome?.toLowerCase().includes(ricerca.toLowerCase()) ||
        lav.titolo?.toLowerCase().includes(ricerca.toLowerCase());
      
      // Estrai tipo dagli allegati se presente
      const tipo = lav.allegati ? JSON.parse(lav.allegati)?.tipologia : null;
      const matchTipo = tipoSelezionato === 'tutti' || tipo === tipoSelezionato;
      
      const matchStato = statoSelezionato === 'tutti' || 
        lav.stato === statoSelezionato;

      return matchRicerca && matchTipo && matchStato;
    });
  }, [lavorazioni, ricerca, tipoSelezionato, statoSelezionato]);

  // Paginazione
  const totalePagine = Math.ceil(lavorazioniFiltrate.length / elementiPerPagina);
  const lavorazioniPaginate = useMemo(() => {
    const inizio = (paginaCorrente - 1) * elementiPerPagina;
    const fine = inizio + elementiPerPagina;
    return lavorazioniFiltrate.slice(inizio, fine);
  }, [lavorazioniFiltrate, paginaCorrente, elementiPerPagina]);

  return {
    lavorazioni,
    lavorazioniFiltrate,
    loading,
    error,
    stats,
    filtri: {
      ricerca,
      tipoSelezionato,
      statoSelezionato,
    },
    paginazione: {
      paginaCorrente,
      elementiPerPagina,
      totalePagine,
    },
    lavorazioniPaginate,
    setRicerca,
    setTipoSelezionato,
    setStatoSelezionato,
    setPaginaCorrente,
    setElementiPerPagina,
    caricaLavorazioni,
  };
}
