import { useState, useCallback } from 'react';

type AzioneType = 'completa' | 'riapri' | 'elimina';

interface UseLavorazioneActionsReturn {
  eseguiAzione: (id: number, azione: AzioneType, onSuccess?: () => void) => Promise<void>;
  eliminaLavorazione: (id: number, onSuccess?: () => void) => Promise<void>;
  loading: boolean;
}

// Funzione helper per notifiche (sostituisce NotificationManager)
const notifySuccess = async (message: string) => {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'info',
        messaggio: message,
        priorita: 'normale'
      })
    });
  } catch (error) {
    console.error('Errore invio notifica:', error);
  }
};

// Ritardo refresh statistiche
const refreshStatsAfterDelay = (callback: () => void, delay: number = 1500) => {
  setTimeout(() => {
    callback();
  }, delay);
};

export function useLavorazioneActions(): UseLavorazioneActionsReturn {
  const [loading, setLoading] = useState(false);

  const eseguiAzione = useCallback(async (
    id: number,
    azione: AzioneType,
    onSuccess?: () => void
  ) => {
    try {
      setLoading(true);

      let nuovoStato: string;
      let messaggioNotifica: string;

      switch (azione) {
        case 'completa':
          nuovoStato = 'completata';
          messaggioNotifica = 'Lavorazione completata con successo';
          break;
        case 'riapri':
          nuovoStato = 'riaperta';
          messaggioNotifica = 'Lavorazione riaperta con successo';
          break;
        default:
          throw new Error(`Azione non valida: ${azione}`);
      }

      const response = await fetch(`/api/lavorazioni/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato: nuovoStato }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'aggiornamento');
      }

      // Notifica successo
      await notifySuccess(messaggioNotifica);

      // Callback successo con ritardo per refresh statistiche
      if (onSuccess) {
        refreshStatsAfterDelay(onSuccess);
      }
    } catch (error) {
      console.error(`Errore ${azione} lavorazione:`, error);
      alert(error instanceof Error ? error.message : `Errore durante ${azione}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const eliminaLavorazione = useCallback(async (
    id: number,
    onSuccess?: () => void
  ) => {
    if (!confirm('Sei sicuro di voler eliminare questa lavorazione?')) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/lavorazioni/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'eliminazione');
      }

      // Notifica eliminazione
      await notifySuccess('Lavorazione eliminata con successo');

      // Callback successo con ritardo per refresh statistiche
      if (onSuccess) {
        refreshStatsAfterDelay(onSuccess);
      }
    } catch (error) {
      console.error('Errore eliminazione lavorazione:', error);
      alert(error instanceof Error ? error.message : 'Errore durante l\'eliminazione');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    eseguiAzione,
    eliminaLavorazione,
    loading,
  };
}
