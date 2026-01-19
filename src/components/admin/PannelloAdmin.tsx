'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Lavorazione } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import FotoViewer from '@/components/ui/FotoViewer'
import GestioneUtenti from './GestioneUtenti'
import GestioneAssegnazioni from './GestioneAssegnazioni'
import WizardLavorazioni from './WizardLavorazioni'
import { PDFGenerator, LavorazionePDF } from '@/lib/pdfGenerator'
import { refreshStatsAfterDelay } from '@/lib/refreshStats'
import { NotificationManager } from '@/lib/notifications'
// Componenti modulari per lavorazioni
import { LavorazioneStats } from './lavorazioni/LavorazioneStats'
import { LavorazioneFiltri } from './lavorazioni/LavorazioneFiltri'
import { LavorazioneCard } from './lavorazioni/LavorazioneCard'
import { Paginazione } from './lavorazioni/Paginazione'

// Hook per evitare hydration errors
function useIsClient() {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])
  return isClient
}

export default function PannelloAdmin() {
  const isClient = useIsClient()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('lavorazioni')
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroStato, setFiltroStato] = useState<string>('tutte')
  const [filtroTipo, setFiltroTipo] = useState<string>('tutte') // Tutte/Lavorazioni/Integrazioni
  const [ricercaCondominio, setRicercaCondominio] = useState<string>('')
  const [paginaCorrente, setPaginaCorrente] = useState(1)
  const [lavorazioneSelezionata, setLavorazioneSelezionata] = useState<Lavorazione | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [nuovaNota, setNuovaNota] = useState('')
  const [azione, setAzione] = useState<string>('')
  const [showWizardLavorazioni, setShowWizardLavorazioni] = useState(false)
  const [lavorazioneDaModificare, setLavorazioneDaModificare] = useState<Lavorazione | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false)
  const [deletedLavorazioneTitle, setDeletedLavorazioneTitle] = useState<string>('')
  const [lavorazioneCreata, setLavorazioneCreata] = useState<any>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailLavorazione, setDetailLavorazione] = useState<Lavorazione | null>(null)
  
  // Inizializza NotificationManager
  const [notificationManager] = useState(() => NotificationManager.getInstance())

  const caricaLavorazioni = useCallback(async () => {
    setLoading(true)
    try {
      // Carica TUTTE le lavorazioni, il filtro sarà applicato client-side
      const response = await fetch('/api/lavorazioni')
      const result = await response.json()

      if (result.success) {
        setLavorazioni(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Errore nel caricamento delle lavorazioni')
    }
    setLoading(false)
  }, []) // Rimosso filtroStato dalla dipendenza

  // Filtraggio client-side con ricerca, stato e tipo
  const lavorazioniFiltrate = useMemo(() => {
    let risultato = [...lavorazioni]

    // Filtro per tipo (Lavorazioni normali vs Integrazioni)
    if (filtroTipo === 'lavorazioni') {
      risultato = risultato.filter(l => !l.lavorazione_originale_id)
    } else if (filtroTipo === 'integrazioni') {
      risultato = risultato.filter(l => l.lavorazione_originale_id)
    }

    // Filtro per stato
    if (filtroStato !== 'tutte') {
      risultato = risultato.filter(l => l.stato === filtroStato)
    }

    // Filtro per ricerca condominio
    if (ricercaCondominio.trim()) {
      const ricercaLower = ricercaCondominio.toLowerCase().trim()
      risultato = risultato.filter(l => 
        l.condomini?.nome?.toLowerCase().includes(ricercaLower) ||
        l.condomini?.indirizzo?.toLowerCase().includes(ricercaLower)
      )
    }

    return risultato
  }, [lavorazioni, filtroStato, filtroTipo, ricercaCondominio])

  // Paginazione client-side (10 per pagina)
  const ITEMS_PER_PAGE = 10
  const totalePagine = Math.ceil(lavorazioniFiltrate.length / ITEMS_PER_PAGE)
  const lavorazioniPaginate = useMemo(() => {
    const startIndex = (paginaCorrente - 1) * ITEMS_PER_PAGE
    return lavorazioniFiltrate.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [lavorazioniFiltrate, paginaCorrente])

  // Reset pagina quando cambiano i filtri
  useEffect(() => {
    setPaginaCorrente(1)
  }, [filtroStato, filtroTipo, ricercaCondominio])

  const handleNuovaLavorazione = async (lavorazione: any) => {
    try {
      const isEditMode = !!lavorazioneDaModificare
      console.log(isEditMode ? 'Modificando lavorazione:' : 'Creando lavorazione:', lavorazione)
      
      // Prepara i dati per l'API
      const lavorazioneData = {
        condominio_id: lavorazione.condominio_id,
        tipologia: lavorazione.tipologia,
        tipologia_verifica_id: lavorazione.tipologia_verifica_id,
        descrizione: lavorazione.descrizione,
        priorita: lavorazione.priorita,
        assegnato_a: lavorazione.assegnato_a,
        data_scadenza: lavorazione.data_scadenza,
        note: lavorazione.note
      }

      let response
      if (isEditMode) {
        // PUT con formato { azione: 'aggiorna', dati: {...} }
        // Invia TUTTI i dati: modificati + originali non modificati
        
        // Parse allegati originali per preservare dati esistenti (foto, firma, ecc.)
        let allegatiOriginali: any = {}
        if (lavorazioneDaModificare.allegati) {
          try {
            allegatiOriginali = typeof lavorazioneDaModificare.allegati === 'string'
              ? JSON.parse(lavorazioneDaModificare.allegati)
              : lavorazioneDaModificare.allegati
          } catch (e) {
            console.warn('Errore parsing allegati originali:', e)
          }
        }
        
        // Merge: nuova tipologia + dati esistenti (foto, firma, dati_verifiche, ecc.)
        const allegatiAggiornati = {
          ...allegatiOriginali, // Mantiene foto, firma, dati_verifica_completamento, ecc.
          tipologia: lavorazione.tipologia,
          tipologia_verifica_id: lavorazione.tipologia_verifica_id
        }
        
        const updateFields: any = {
          descrizione: lavorazione.descrizione,
          priorita: lavorazione.priorita,
          user_id: lavorazione.assegnato_a || lavorazioneDaModificare.user_id,
          data_scadenza: lavorazione.data_scadenza || lavorazioneDaModificare.data_scadenza,
          note: lavorazione.note || lavorazioneDaModificare.note,
          allegati: JSON.stringify(allegatiAggiornati)
        }
        
        // Mantieni anche dati_verifiche se esistono
        if (lavorazioneDaModificare.dati_verifiche) {
          updateFields.dati_verifiche = lavorazioneDaModificare.dati_verifiche
        }
        
        console.log('📤 Dati aggiornamento completi:', updateFields)
        
        response = await fetch(`/api/lavorazioni/${lavorazioneDaModificare.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            azione: 'aggiorna',
            dati: updateFields
          })
        })
      } else {
        // POST per nuova lavorazione
        response = await fetch('/api/lavorazioni', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(lavorazioneData)
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Errore nella ${isEditMode ? 'modifica' : 'creazione'} della lavorazione`)
      }

      const result = await response.json()
      
      if (result.success) {
        console.log(`Lavorazione ${isEditMode ? 'modificata' : 'creata'} con successo:`, result.data)
        
        // Arricchisce i dati con i nomi per la modale di successo
        setLavorazioneCreata({
          ...result.data,
          ...lavorazioneData // Include tutti i dati del form per il riepilogo
        })
        setShowWizardLavorazioni(false)
        setLavorazioneDaModificare(null)
        setShowSuccessModal(true)
        
        // Ricarica la lista delle lavorazioni
        await caricaLavorazioni()
        
        // 🔄 Refresh delle statistiche del dashboard
        refreshStatsAfterDelay(1000)
      } else {
        throw new Error(result.error || `Errore nella ${isEditMode ? 'modifica' : 'creazione'} della lavorazione`)
      }
      
    } catch (error) {
      console.error('Errore lavorazione:', error)
      alert(`Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
    }
  }

  useEffect(() => {
    caricaLavorazioni()
  }, [caricaLavorazioni])

  const eseguiAzione = async (lavorazioneId: string, tipoAzione: string, nota?: string) => {
    console.log('🔄 Eseguo azione:', { lavorazioneId, tipoAzione, nota })
    
    try {
      const requestBody = {
        azione: tipoAzione,
        dati: {
          nota: nota,
          motivo: nota // Per riaperture
        }
      }
      
      console.log('📤 Request body:', requestBody)
      
      const response = await fetch(`/api/lavorazioni/${lavorazioneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('📥 Response status:', response.status)
      const result = await response.json()
      console.log('📋 Response result:', result)

      if (result.success) {
        caricaLavorazioni()
        setShowModal(false)
        setNuovaNota('')
        
        // 🔔 Crea notifica per cambio stato
        if (lavorazioneSelezionata) {
          try {
            // Determina il tipo di notifica basato sull'azione
            let titoloNotifica = ''
            let messaggioNotifica = ''
            
            switch (tipoAzione) {
              case 'completa':
                titoloNotifica = '✅ Lavorazione Completata'
                messaggioNotifica = `La lavorazione "${lavorazioneSelezionata.titolo}" è stata completata dall'amministratore.`
                break
              case 'riapri':
                titoloNotifica = '🔄 Lavorazione Riaperta'
                messaggioNotifica = `La lavorazione "${lavorazioneSelezionata.titolo}" è stata riaperta. Motivo: ${nota || 'Non specificato'}`
                break
              case 'annulla':
                titoloNotifica = '❌ Lavorazione Annullata'
                messaggioNotifica = `La lavorazione "${lavorazioneSelezionata.titolo}" è stata annullata. Motivo: ${nota || 'Non specificato'}`
                break
              default:
                titoloNotifica = '📋 Aggiornamento Lavorazione'
                messaggioNotifica = `La lavorazione "${lavorazioneSelezionata.titolo}" è stata aggiornata dall'amministratore.`
            }
            
            await notificationManager.creaNotifica({
              utente_id: lavorazioneSelezionata.user_id,
              tipo: tipoAzione === 'completa' ? 'lavorazione_completata' : 'nuova_assegnazione',
              titolo: titoloNotifica,
              messaggio: messaggioNotifica,
              lavorazione_id: lavorazioneSelezionata.id,
              priorita: tipoAzione === 'annulla' ? 'alta' : 'media'
            })
            
            console.log('✅ Notifica creata per azione:', tipoAzione)
          } catch (notifError) {
            console.error('⚠️ Errore creazione notifica:', notifError)
          }
        }
        
        setLavorazioneSelezionata(null)
        
        // 🔄 Refresh delle statistiche del dashboard per cambi stato lavorazioni
        refreshStatsAfterDelay(1000)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Errore nell\'esecuzione dell\'azione')
    }
  }

  const handleAzione = (lavorazione: Lavorazione, tipoAzione: string) => {
    setLavorazioneSelezionata(lavorazione)
    setAzione(tipoAzione)
    setShowModal(true)
  }

  const confermaAzione = () => {
    if (lavorazioneSelezionata) {
      eseguiAzione(lavorazioneSelezionata.id, azione, nuovaNota)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      // Formato sicuro per evitare hydration errors
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      
      return `${day}/${month}/${year} ${hours}:${minutes}`
    } catch (error) {
      return dateString
    }
  }

  const getStatoColor = (stato: string) => {
    switch (stato) {
      case 'da_eseguire': return '🔴'
      case 'in_corso': return '🔴'
      case 'completata': return '🔴'
      case 'riaperta': return '🔴'
      default: return '🔴'
    }
  }

  const getStatoIcon = (stato: string) => {
    switch (stato) {
      case 'da_eseguire': return '🔴'
      case 'in_corso': return '⏳'
      case 'completata': return '✅'
      case 'riaperta': return '🔄'
      default: return '�'
    }
  }

  const handleModifica = (lavorazione: Lavorazione) => {
    setLavorazioneDaModificare(lavorazione)
    setShowWizardLavorazioni(true)
  }

  const handleCancella = (lavorazione: Lavorazione) => {
    setLavorazioneSelezionata(lavorazione)
    setAzione('elimina')
    setShowModal(true)
  }

  const mostraDettaglio = (lavorazione: Lavorazione) => {
    setDetailLavorazione(lavorazione)
    setShowDetailModal(true)
  }

  const confermaEliminazione = async () => {
    if (!lavorazioneSelezionata) return
    
    try {
      const response = await fetch(`/api/lavorazioni/${lavorazioneSelezionata.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nella cancellazione')
      }

      const result = await response.json()
      
      if (result.success) {
        setShowModal(false)
        setDeletedLavorazioneTitle(lavorazioneSelezionata.titolo || 'Lavorazione')
        setLavorazioneSelezionata(null)
        await caricaLavorazioni() // Ricarica la lista
        
        // 🔄 Refresh delle statistiche del dashboard
        refreshStatsAfterDelay(1000)
        
        // Mostra modal di successo invece di alert
        setShowDeleteSuccessModal(true)
      } else {
        throw new Error(result.error || 'Errore nella cancellazione')
      }
      
    } catch (error) {
      console.error('Errore cancellazione lavorazione:', error)
      alert(`Errore nella cancellazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
    }
  }

  const stats = {
    totali: lavorazioni.length,
    da_eseguire: lavorazioni.filter(l => l.stato === 'da_eseguire').length,
    in_corso: lavorazioni.filter(l => l.stato === 'in_corso').length,
    completata: lavorazioni.filter(l => l.stato === 'completata').length,
    riaperte: lavorazioni.filter(l => l.stato === 'riaperta').length
  }

  // Componente Modale Dettaglio Lavorazione
  const ModalDettaglioLavorazione = ({ lavorazione }: { lavorazione: Lavorazione }) => {
    const generaPDF = () => {
      const pdfGenerator = new PDFGenerator()
      
      // Estrai dati completamento se presenti
      let firma: string | undefined
      let geolocations: Array<{fotoUrl: string, latitude: number, longitude: number, accuracy?: number}> = []
      
      try {
        console.log('🔍 Estrazione metadata da lavorazione.allegati:', lavorazione.allegati)
        const metadata = JSON.parse(lavorazione.allegati || '{}')
        console.log('📦 Metadata parsato COMPLETO:', JSON.stringify(metadata, null, 2))
        console.log('📦 Chiavi presenti nel metadata:', Object.keys(metadata))
        
        // Estrai firma
        if (metadata.firma) {
          firma = metadata.firma
          console.log('✅ Firma trovata nel metadata.firma:', metadata.firma.substring(0, 50) + '...')
        } else {
          console.log('❌ Firma NON trovata in metadata.firma')
          console.log('🔍 Cerco firma in altri campi...')
          
          // Prova altri possibili campi
          if (metadata.dati && metadata.dati.firma) {
            firma = metadata.dati.firma
            console.log('✅ Firma trovata in metadata.dati.firma:', metadata.dati.firma.substring(0, 50) + '...')
          } else if (metadata.foto_firma) {
            firma = metadata.foto_firma
            console.log('✅ Firma trovata in metadata.foto_firma:', metadata.foto_firma.substring(0, 50) + '...')
          } else {
            console.log('❌ Firma non trovata in nessun campo del metadata')
          }
        }
        
        // Estrai GPS dalle foto (se presente nel metadata)
        if (metadata.foto_geo) {
          geolocations = metadata.foto_geo
          console.log('✅ GPS trovato nel metadata:', geolocations.length, 'locations')
        } else {
          console.log('❌ GPS NON trovato nel metadata (foto_geo)')
        }
      } catch (e) {
        console.log('⚠️ Errore parsing metadata:', e)
      }
      
      // Converti la lavorazione nel formato richiesto
      const lavorazionePDF: LavorazionePDF = {
        id: lavorazione.id,
        titolo: lavorazione.titolo || lavorazione.descrizione,
        descrizione: lavorazione.descrizione,
        stato: lavorazione.stato,
        priorita: lavorazione.priorita || 'media',
        data_apertura: lavorazione.data_apertura,
        data_completamento: (lavorazione as any).data_completamento || undefined,
        condominio: lavorazione.condomini ? {
          nome: lavorazione.condomini.nome,
          indirizzo: lavorazione.condomini.indirizzo || undefined
        } : undefined,
        utente: lavorazione.users ? {
          nome: lavorazione.users.nome,
          cognome: lavorazione.users.cognome,
          email: lavorazione.users.email
        } : undefined,
        note: typeof lavorazione.note === 'string' ? lavorazione.note : 
               Array.isArray(lavorazione.note) ? lavorazione.note.join('\n') : undefined,
        allegati: lavorazione.allegati || undefined,
        firma: firma,
        geolocations: geolocations.length > 0 ? geolocations : undefined
      }
      
      console.log('📄 Dati finali per PDF:', {
        hasFirma: !!lavorazionePDF.firma,
        firmaLength: lavorazionePDF.firma?.length,
        hasGeolocations: !!lavorazionePDF.geolocations,
        geolocationsCount: lavorazionePDF.geolocations?.length
      })
      
      // Scarica il PDF
      pdfGenerator.downloadPDF(lavorazionePDF)
    }

    const getStatoInfo = (stato: string) => {
      switch (stato) {
        case 'aperta':
        case 'da_eseguire':
          return { 
            icon: '🔴', 
            color: 'bg-red-100 text-red-800',
            label: 'DA ESEGUIRE'
          }
        case 'in_corso':
          return { 
            icon: '⏳', 
            color: 'bg-yellow-100 text-yellow-800',
            label: 'IN CORSO'
          }
        case 'completata':
          return { 
            icon: '✅', 
            color: 'bg-green-100 text-green-800',
            label: 'COMPLETATA'
          }
        case 'riaperta':
          return { 
            icon: '🔄', 
            color: 'bg-orange-100 text-orange-800',
            label: 'RIAPERTA'
          }
        default:
          return { 
            icon: '📄', 
            color: 'bg-gray-100 text-gray-800',
            label: 'ALTRO'
          }
      }
    }

    const formatDetailDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const statoInfo = getStatoInfo(lavorazione.stato)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-3xl mr-4">{statoInfo.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold">
                    {lavorazione.titolo || lavorazione.descrizione}
                  </h2>
                  <div className="flex items-center mt-2">
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20 text-white">
                      {statoInfo.label}
                    </span>
                    <span className="ml-3 text-blue-100">ID: {lavorazione.id.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setDetailLavorazione(null)
                }}
                className="text-white hover:text-gray-200 text-2xl p-2"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informazioni Principali */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Informazioni Principali</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-700">Descrizione:</span>
                      <div className="text-right max-w-sm">
                        <span className="text-gray-900">{lavorazione.descrizione}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Priorità:</span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        lavorazione.priorita === 'alta' ? 'bg-red-100 text-red-800' :
                        lavorazione.priorita === 'media' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {(lavorazione.priorita || 'media').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Condominio */}
                {lavorazione.condomini && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🏢 Condominio</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="font-semibold text-blue-900">{lavorazione.condomini.nome}</div>
                      {lavorazione.condomini.indirizzo && (
                        <div className="text-blue-700 text-sm mt-1">📍 {lavorazione.condomini.indirizzo}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Assegnazione */}
                {lavorazione.users && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Assegnazione</h3>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="font-semibold text-green-900">
                        {lavorazione.users.nome} {lavorazione.users.cognome}
                      </div>
                      <div className="text-green-700 text-sm mt-1">📧 {lavorazione.users.email}</div>
                    </div>
                  </div>
                )}

              </div>

              {/* Date e Timeline */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Timeline</h3>
                  <div className="space-y-3">
                    {lavorazione.data_apertura && (
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">Creazione</div>
                          <div className="text-sm text-gray-600">{formatDetailDate(lavorazione.data_apertura)}</div>
                        </div>
                      </div>
                    )}
                    
                    {lavorazione.data_assegnazione && (
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">Assegnazione</div>
                          <div className="text-sm text-gray-600">{formatDetailDate(lavorazione.data_assegnazione)}</div>
                        </div>
                      </div>
                    )}
                    
                    {lavorazione.stato === 'completata' && (
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">Completamento</div>
                          <div className="text-sm text-gray-600">Completata</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tipologia Lavorazione */}
                {lavorazione.allegati && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Tipologia</h3>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="font-semibold text-yellow-900">
                        {
                          (() => {
                            try {
                              const metadata = JSON.parse(lavorazione.allegati)
                              if (metadata.tipologia === 'manutenzione') return '🔴'
                              if (metadata.tipologia === 'riparazione') return '🔴'
                              if (metadata.tipologia === 'verifica') return '🔴'
                              if (metadata.tipologia === 'sicurezza') return '🔴'
                              if (metadata.tipologia === 'pulizia') return '🔴'
                              return metadata.tipologia || 'Altro'
                            } catch {
                              return '🔴'
                            }
                          })()
                        }
                      </div>
                    </div>
                  </div>
                )}

                {/* Note */}
                {lavorazione.note && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Note</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-gray-800 whitespace-pre-wrap">
                        {typeof lavorazione.note === 'string' 
                          ? lavorazione.note 
                          : Array.isArray(lavorazione.note) 
                            ? (lavorazione.note as string[]).join('\n• ')
                            : 'Nessuna nota disponibile'
                        }
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF Report per lavorazioni completate */}
                {lavorazione.stato === 'completata' && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📄 Report</h3>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
                      <div className="text-4xl mb-4">📋</div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Report PDF Dettagliato</h4>
                      <p className="text-gray-600 mb-4">Scarica il report completo con tutti i dettagli della verifica</p>
                      <button 
                        onClick={generaPDF}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        📥 Scarica Report PDF
                      </button>
                      <div className="text-xs text-gray-500 mt-2">
                        Report automatico con tutti i dettagli della verifica
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={() => {
                setShowDetailModal(false)
                setDetailLavorazione(null)
              }}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Caricamento lavorazioni...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Pannello Amministratore</h2>
        <p className="text-gray-600">
          Gestisci lavorazioni, utenti e configurazioni del sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('lavorazioni')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'lavorazioni'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔧 Lavorazioni
          </button>
          <button
            onClick={() => setActiveTab('utenti')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'utenti'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            👥 Utenti
          </button>
          <button
            onClick={() => setActiveTab('assegnazioni')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assegnazioni'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🏢 Assegnazioni Condomini
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'utenti' && <GestioneUtenti />}
      {activeTab === 'assegnazioni' && <GestioneAssegnazioni />}
      
      {activeTab === 'lavorazioni' && (
        <div className="space-y-6">

      {/* Statistiche - Componente modulare */}
      <LavorazioneStats stats={stats} />

      {/* Filtri - Componente modulare */}
      <LavorazioneFiltri
        ricerca={ricercaCondominio}
        tipoSelezionato={filtroTipo}
        statoSelezionato={filtroStato}
        onRicercaChange={setRicercaCondominio}
        onTipoChange={setFiltroTipo}
        onStatoChange={setFiltroStato}
        onReload={caricaLavorazioni}
      />

      {/* Info risultati e reset filtri */}
      <div className="flex items-center justify-between text-sm text-gray-600 bg-white p-4 rounded-lg shadow">
        <div>
          Visualizzati <strong>{lavorazioniPaginate.length}</strong> di{' '}
          <strong>{lavorazioniFiltrate.length}</strong> risultati
          {lavorazioni.length !== lavorazioniFiltrate.length && (
            <span className="text-blue-600"> (filtrate da {lavorazioni.length} totali)</span>
          )}
        </div>
        {(ricercaCondominio || filtroStato !== 'tutte' || filtroTipo !== 'tutte') && (
          <button
            onClick={() => {
              setRicercaCondominio('')
              setFiltroStato('tutte')
              setFiltroTipo('tutte')
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Cancella filtri
          </button>
        )}
      </div>

      {/* Pulsante Nuova Lavorazione */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowWizardLavorazioni(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>✨</span>
          Nuova Lavorazione
        </button>
      </div>

      {/* Lista Lavorazioni */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-600">❌ {error}</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border">
        {lavorazioniFiltrate.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <h3 className="text-lg font-medium mb-2">Nessuna lavorazione trovata</h3>
            <p>Non ci sono lavorazioni che corrispondono ai filtri selezionati</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {lavorazioniPaginate.map((lavorazione) => {
              if (!lavorazione || !lavorazione.id) return null
              
              return (
                <div key={lavorazione.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-2xl">{getStatoIcon(lavorazione.stato)}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatoColor(lavorazione.stato)}`}>
                        {lavorazione.stato.toUpperCase()}
                      </span>
                      {/* Badge Integrazione */}
                      {lavorazione.lavorazione_originale_id && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-300">
                          ⚡ INTEGRAZIONE
                        </span>
                      )}
                      {isClient && (lavorazione as any)?.priorita && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          (lavorazione as any).priorita === 'alta' ? 'bg-red-100 text-red-800' :
                          (lavorazione as any).priorita === 'media' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {(lavorazione as any).priorita === 'alta' ? '🔴 ALTA' :
                           (lavorazione as any).priorita === 'media' ? '🟡 MEDIA' :
                           '⚪ BASSA'}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {lavorazione.descrizione}
                    </h3>
                    
                    {isClient ? (
                      <div className="text-sm text-gray-600 space-y-1 mb-3">
                        {/* Informazioni principali con controlli sicuri */}
                        {(lavorazione as any).condomini?.nome && (
                          <div className="bg-blue-50 p-2 rounded">
                            <strong>🏢 Condominio:</strong> {(lavorazione as any).condomini.nome}
                            {(lavorazione as any).condomini?.indirizzo && (
                              <div className="text-xs text-gray-500 mt-1">
                                📍 {(lavorazione as any).condomini.indirizzo}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {(lavorazione as any).users?.nome && (
                          <div className="bg-green-50 p-2 rounded">
                            <strong>👤 Assegnato a:</strong> {(lavorazione as any).users.nome} {(lavorazione as any).users.cognome || ''}
                            {(lavorazione as any).users?.username && (
                              <div className="text-xs text-gray-500">
                                @{(lavorazione as any).users.username}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {(lavorazione as any).tipologia && (
                          <div className="bg-yellow-50 p-2 rounded">
                            <strong>🔧 Tipo:</strong> {
                              (lavorazione as any).tipologia === 'manutenzione' ? 'Manutenzione Ordinaria' :
                              (lavorazione as any).tipologia === 'riparazione' ? 'Riparazione Urgente' :
                              (lavorazione as any).tipologia === 'verifica' ? 'Verifica Tecnica' :
                              (lavorazione as any).tipologia === 'sicurezza' ? 'Sicurezza e Conformità' :
                              (lavorazione as any).tipologia === 'pulizia' ? 'Pulizia Straordinaria' :
                              'Altro'
                            }
                          </div>
                        )}
                        
                        <div><strong>📅 Aperta:</strong> {formatDate(lavorazione.data_apertura)}</div>
                        {lavorazione.data_chiusura && (
                          <div><strong>✅ Chiusa:</strong> {formatDate(lavorazione.data_chiusura)}</div>
                        )}
                        {lavorazione.data_riapertura && (
                          <div><strong>🔄 Riaperta:</strong> {formatDate(lavorazione.data_riapertura)}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 space-y-1 mb-3">
                        <div><strong>📅 Aperta:</strong> {lavorazione.data_apertura}</div>
                        <div className="text-gray-500">Caricamento dettagli...</div>
                      </div>
                    )}
                    
                    {isClient && lavorazione.note && (
                      <div className="bg-gray-50 p-3 rounded-md mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Note:
                        </div>
                        <div className="text-sm text-gray-600">
                          {typeof lavorazione.note === 'string' 
                            ? lavorazione.note 
                            : Array.isArray(lavorazione.note) 
                              ? (lavorazione.note as string[]).map((nota: string, index: number) => (
                                  <div key={index} className="flex items-start mb-1">
                                    <span className="text-blue-500 mr-2">•</span>
                                    {nota}
                                  </div>
                                ))
                              : 'Nessuna nota disponibile'
                          }
                        </div>
                      </div>
                    )}
                    
                    {/* Visualizzazione foto */}
                    {lavorazione.verifica?.dati_verifica && 
                      Object.entries(lavorazione.verifica.dati_verifica).some(([_, value]) => 
                        Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0].startsWith('data:image')
                      ) && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <div className="text-sm font-medium text-gray-700 mb-3">
                            📷 Foto Allegate
                          </div>
                          <div className="space-y-4">
                            {Object.entries(lavorazione.verifica.dati_verifica)
                              .filter(([_, value]) => 
                                Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0].startsWith('data:image')
                              )
                              .map(([nome, foto]) => (
                                <FotoViewer
                                  key={nome}
                                  foto={foto as string[]}
                                  nome={nome}
                                />
                              ))
                            }
                          </div>
                        </div>
                      )
                    }
                  </div>
                  
                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={() => handleAzione(lavorazione, 'aggiungi_nota')}
                      className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-200 rounded"
                    >
                      📝 Aggiungi Nota
                    </button>
                    
                    {(lavorazione.stato === 'da_eseguire' || lavorazione.stato === 'in_corso') && (
                      <button
                        onClick={() => handleAzione(lavorazione, 'completa')}
                        className="text-green-600 hover:text-green-800 text-sm px-3 py-1 border border-green-200 rounded"
                      >
                        ✅ Completa
                      </button>
                    )}
                    
                    {/* Pulsanti CRUD */}
                    <button
                      onClick={() => mostraDettaglio(lavorazione)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm px-3 py-1 border border-indigo-200 rounded"
                    >
                      👁️ Dettagli
                    </button>
                    
                    <button
                      onClick={() => handleModifica(lavorazione)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-200 rounded"
                    >
                      ✏️ Modifica
                    </button>
                    
                    <button
                      onClick={() => handleCancella(lavorazione)}
                      className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-200 rounded"
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}

        {/* Paginazione */}
        {totalePagine > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Pagina <strong>{paginaCorrente}</strong> di <strong>{totalePagine}</strong>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaCorrente(p => Math.max(1, p - 1))}
                  disabled={paginaCorrente === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Precedente
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalePagine }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setPaginaCorrente(page)}
                      className={`w-8 h-8 rounded-md ${
                        page === paginaCorrente
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPaginaCorrente(p => Math.min(totalePagine, p + 1))}
                  disabled={paginaCorrente === totalePagine}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Successiva →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal per azioni */}
      {showModal && lavorazioneSelezionata && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {azione === 'chiudi' && 'Chiudi Lavorazione'}
              {azione === 'aggiungi_nota' && 'Aggiungi Nota'}
              {azione === 'elimina' && '🗑️ Elimina Lavorazione'}
            </h3>
            
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                <strong>Lavorazione:</strong> {lavorazioneSelezionata.descrizione}
              </div>
              
              {azione === 'elimina' ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-800 text-sm">
                    ⚠️ <strong>Attenzione:</strong> Questa azione eliminerà definitivamente la lavorazione e non può essere annullata.
                  </p>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {azione === 'aggiungi_nota' ? 'Nuova nota:' : 'Nota (opzionale):'}
                  </label>
                  <textarea
                    value={nuovaNota}
                    onChange={(e) => setNuovaNota(e.target.value)}
                    placeholder="Inserisci una nota..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={azione === 'elimina' ? confermaEliminazione : confermaAzione}
                className={`px-4 py-2 text-white rounded-md transition-colors ${
                  azione === 'elimina' 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {azione === 'elimina' ? '🗑️ Elimina' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Wizard Nuova Lavorazione */}
      {showWizardLavorazioni && (
        <WizardLavorazioni
          onClose={() => {
            setShowWizardLavorazioni(false)
            setLavorazioneDaModificare(null)
          }}
          onComplete={handleNuovaLavorazione}
          lavorazioneDaModificare={lavorazioneDaModificare ? (() => {
            // Parse allegati in modo sicuro
            let tipologia = 'altro'
            let tipologia_verifica_id = undefined
            
            if (lavorazioneDaModificare.allegati) {
              try {
                const allegatiParsed = typeof lavorazioneDaModificare.allegati === 'string' 
                  ? JSON.parse(lavorazioneDaModificare.allegati) 
                  : lavorazioneDaModificare.allegati
                
                tipologia = allegatiParsed.tipologia || 'altro'
                tipologia_verifica_id = allegatiParsed.tipologia_verifica_id
              } catch (e) {
                console.warn('Errore parsing allegati per modifica:', e)
              }
            }
            
            return {
              id: lavorazioneDaModificare.id,
              condominio_id: lavorazioneDaModificare.condominio_id,
              tipologia,
              tipologia_verifica_id,
              descrizione: lavorazioneDaModificare.descrizione,
              priorita: (lavorazioneDaModificare.priorita === 'critica' ? 'alta' : lavorazioneDaModificare.priorita) as 'bassa' | 'media' | 'alta',
              assegnato_a: lavorazioneDaModificare.user_id,
              data_scadenza: lavorazioneDaModificare.data_scadenza,
              note: typeof lavorazioneDaModificare.note === 'string' ? lavorazioneDaModificare.note : undefined,
              allegati: lavorazioneDaModificare.allegati
            }
          })() : undefined}
        />
      )}

      {/* Modal di Successo Creazione Lavorazione */}
      {showSuccessModal && lavorazioneCreata && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center">
                <div className="text-3xl mr-3">✅</div>
                <h2 className="text-xl font-bold">Lavorazione Creata con Successo!</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Dettagli Lavorazione:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Condominio:</span>
                      <span className="font-medium">{
                        // Cerca il nome del condominio dalla lista caricata
                        lavorazioni.length > 0 
                          ? lavorazioni.find(l => l.condomini)?.condomini?.nome || lavorazioneCreata.condominio_id
                          : lavorazioneCreata.condominio_id
                      }</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipologia:</span>
                      <span className="font-medium">{
                        // Mappa la tipologia con il nome user-friendly
                        lavorazioneCreata.tipologia === 'manutenzione' ? 'Manutenzione Ordinaria' :
                        lavorazioneCreata.tipologia === 'riparazione' ? 'Riparazione Urgente' :
                        lavorazioneCreata.tipologia === 'verifica' ? 'Verifica Tecnica' :
                        lavorazioneCreata.tipologia === 'sicurezza' ? 'Sicurezza e Conformità' :
                        lavorazioneCreata.tipologia === 'pulizia' ? 'Pulizia Straordinaria' :
                        lavorazioneCreata.tipologia || 'Altro'
                      }</span>
                    </div>
                    {lavorazioneCreata.tipologia_verifica_nome && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Verifica Specifica:</span>
                        <span className="font-medium text-blue-600">{lavorazioneCreata.tipologia_verifica_nome}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priorità:</span>
                      <span className={`font-medium px-2 py-1 rounded text-xs ${
                        lavorazioneCreata.priorita === 'urgente' ? 'bg-red-100 text-red-800' :
                        lavorazioneCreata.priorita === 'alta' ? 'bg-orange-100 text-orange-800' :
                        lavorazioneCreata.priorita === 'media' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {lavorazioneCreata.priorita}
                      </span>
                    </div>
                    {lavorazioneCreata.assegnato_a && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Assegnato a:</span>
                        <span className="font-medium text-blue-600">{lavorazioneCreata.assegnato_a}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <div className="flex items-start">
                    <div className="text-blue-400 mr-2">ℹ️</div>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Prossimi passi:</p>
                      <p className="text-sm text-blue-700 mt-1">
                        {lavorazioneCreata.assegnato_a 
                          ? "Il sopralluoghista riceverà una notifica e potrà iniziare la lavorazione."
                          : "Assegna la lavorazione a un sopralluoghista dalla lista lavorazioni."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    setLavorazioneCreata(null)
                  }}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Chiudi
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    setLavorazioneCreata(null)
                    setShowWizardLavorazioni(true)
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crea Altra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal di Successo Eliminazione Lavorazione */}
      {showDeleteSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center">
                <div className="text-3xl mr-3">🗑️</div>
                <h2 className="text-xl font-bold">Lavorazione Eliminata!</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    La lavorazione <span className="font-semibold text-gray-900">&quot;{deletedLavorazioneTitle}&quot;</span> è stata eliminata con successo.
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                  <div className="flex items-start">
                    <div className="text-green-400 mr-2">✓</div>
                    <div>
                      <p className="text-sm text-green-800 font-medium">Operazione completata</p>
                      <p className="text-sm text-green-700 mt-1">
                        La lista delle lavorazioni è stata aggiornata automaticamente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDeleteSuccessModal(false)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dettaglio Lavorazione */}
      {showDetailModal && detailLavorazione && (
        <ModalDettaglioLavorazione lavorazione={detailLavorazione} />
      )}
    </div>
  )
}