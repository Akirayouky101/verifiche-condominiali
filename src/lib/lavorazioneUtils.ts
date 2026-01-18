// Utility functions per lavorazioni

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return '-';
  }
}

export function getStatoInfo(stato: string): { label: string; color: string } {
  const stati: Record<string, { label: string; color: string }> = {
    da_eseguire: { label: 'Da Eseguire', color: 'bg-gray-100 text-gray-800' },
    in_corso: { label: 'In Corso', color: 'bg-yellow-100 text-yellow-800' },
    completata: { label: 'Completata', color: 'bg-green-100 text-green-800' },
    riaperta: { label: 'Riaperta', color: 'bg-red-100 text-red-800' },
    integrazione: { label: 'Integrazione', color: 'bg-purple-100 text-purple-800' },
  };

  return stati[stato] || { label: stato, color: 'bg-gray-100 text-gray-800' };
}

export function getPrioritaInfo(priorita: string): { label: string; color: string } {
  const prioritas: Record<string, { label: string; color: string }> = {
    bassa: { label: 'Bassa', color: 'bg-blue-100 text-blue-800' },
    media: { label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
    alta: { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
    critica: { label: 'Critica', color: 'bg-red-100 text-red-800' },
  };

  return prioritas[priorita] || { label: priorita, color: 'bg-gray-100 text-gray-800' };
}

export function getTipologiaFromAllegati(allegati: string | undefined): string {
  if (!allegati) return '-';
  
  try {
    const parsed = JSON.parse(allegati);
    return parsed.tipologia || '-';
  } catch {
    return '-';
  }
}
