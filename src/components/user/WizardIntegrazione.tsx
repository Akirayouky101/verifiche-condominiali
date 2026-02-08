'use client'

import { useState, useEffect } from 'react'
import { Lavorazione, CampoRiapertura } from '@/lib/types'

interface WizardIntegrazioneProps {
  lavorazione: Lavorazione
  onClose: () => void
  onSuccess: () => void
  userId: string
}

type Step = 1 | 2

export default function WizardIntegrazione({
  lavorazione,
  onClose,
  onSuccess,
  userId
}: WizardIntegrazioneProps) {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Campi da ricompilare e nuovi campi (parsed da JSONB)
  const [campiDaRicompilare, setCampiDaRicompilare] = useState<CampoRiapertura[]>([])
  const [campiNuovi, setCampiNuovi] = useState<CampoRiapertura[]>([])

  // Valori compilati
  const [valoriRicompilati, setValoriRicompilati] = useState<Record<string, any>>({})
  const [valoriNuovi, setValoriNuovi] = useState<Record<string, any>>({})

  // Foto esistenti dal blob storage
  const [fotoEsistenti, setFotoEsistenti] = useState<Array<{
    url: string
    downloadUrl: string
    pathname: string
    nome: string
    size: number
    uploadedAt: string
  }>>([])
  
  // Tracciamento modifiche foto: quali tenere, quali rimuovere, quali nuove
  const [fotoMantenute, setFotoMantenute] = useState<string[]>([]) // pathname delle foto da mantenere
  const [fotoNuove, setFotoNuove] = useState<Record<string, File[]>>({}) // nomeCampo -> File[]

  // Carica i campi dalla lavorazione
  useEffect(() => {
    try {
      // Parse campi_da_ricompilare
      if (lavorazione.campi_da_ricompilare) {
        const campiRicomp = typeof lavorazione.campi_da_ricompilare === 'string'
          ? JSON.parse(lavorazione.campi_da_ricompilare)
          : lavorazione.campi_da_ricompilare

        if (Array.isArray(campiRicomp)) {
          setCampiDaRicompilare(campiRicomp)
          
          // Pre-compila con valori precedenti
          const valoriIniziali: Record<string, any> = {}
          campiRicomp.forEach((campo: any) => {
            if (campo.valore_precedente !== undefined) {
              valoriIniziali[campo.nome] = campo.valore_precedente
            }
          })
          setValoriRicompilati(valoriIniziali)
        }
      }

      // Parse campi_nuovi
      if (lavorazione.campi_nuovi) {
        const nuoviCampi = typeof lavorazione.campi_nuovi === 'string'
          ? JSON.parse(lavorazione.campi_nuovi)
          : lavorazione.campi_nuovi

        if (Array.isArray(nuoviCampi)) {
          setCampiNuovi(nuoviCampi)
        }
      }
    } catch (err) {
      console.error('Errore parsing campi:', err)
      setError('Errore nel caricamento dei campi. Contatta l\'amministratore.')
    }
  }, [lavorazione])

  // Carica foto esistenti dal blob storage
  useEffect(() => {
    const loadFotoEsistenti = async () => {
      try {
        console.log('📸 Loading foto esistenti for lavorazione:', lavorazione.id)
        
        const response = await fetch(`/api/lavorazioni/${lavorazione.id}/foto`)
        if (!response.ok) {
          console.warn('⚠️ Nessuna foto trovata o errore API foto')
          return
        }

        const data = await response.json()
        
        if (data.success && data.foto && Array.isArray(data.foto)) {
          console.log(`✅ Loaded ${data.foto.length} foto esistenti`)
          setFotoEsistenti(data.foto)
          
          // Inizialmente mantieni tutte le foto esistenti
          setFotoMantenute(data.foto.map((f: any) => f.pathname))
        }
      } catch (err) {
        console.error('❌ Errore caricamento foto esistenti:', err)
        // Non bloccare il wizard se le foto non si caricano
      }
    }

    loadFotoEsistenti()
  }, [lavorazione.id])

  const handleValoreRicompilatoChange = (nomeCampo: string, valore: any) => {
    setValoriRicompilati({
      ...valoriRicompilati,
      [nomeCampo]: valore
    })
  }

  const handleValoreNuovoChange = (nomeCampo: string, valore: any) => {
    setValoriNuovi({
      ...valoriNuovi,
      [nomeCampo]: valore
    })
  }

  const validateStep = (currentStep: Step): boolean => {
    if (currentStep === 1) {
      // Valida che tutti i campi da ricompilare siano compilati
      const campiMancanti = campiDaRicompilare.filter(
        campo => !valoriRicompilati[campo.nome] || valoriRicompilati[campo.nome] === ''
      )
      
      if (campiMancanti.length > 0) {
        setError(`Compila tutti i campi da ricompilare: ${campiMancanti.map(c => c.label).join(', ')}`)
        return false
      }
    } else if (currentStep === 2) {
      // Valida che tutti i campi nuovi obbligatori siano compilati
      const campiMancanti = campiNuovi.filter(
        campo => campo.required && (!valoriNuovi[campo.nome] || valoriNuovi[campo.nome] === '')
      )
      
      if (campiMancanti.length > 0) {
        setError(`Compila tutti i campi obbligatori: ${campiMancanti.map(c => c.label).join(', ')}`)
        return false
      }
    }
    
    setError(null)
    return true
  }

  const handleNext = () => {
    if (!validateStep(step)) return

    if (step === 1 && campiNuovi.length > 0) {
      setStep(2)
    } else {
      // Se non ci sono campi nuovi, invia subito
      handleSubmit()
    }
  }

  const handleBack = () => {
    setError(null)
    if (step > 1) setStep((step - 1) as Step)
  }

  const handleSubmit = async () => {
    if (!validateStep(step === 1 ? 1 : 2)) return

    setLoading(true)
    setError(null)

    try {
      // Prepara FormData per gestire file upload
      const formData = new FormData()
      
      // Dati JSON base
      formData.append('campi_ricompilati', JSON.stringify(valoriRicompilati))
      formData.append('campi_nuovi_compilati', JSON.stringify(valoriNuovi))
      formData.append('utente_id', userId)
      
      // Foto da mantenere (pathname delle foto esistenti)
      formData.append('foto_mantenute', JSON.stringify(fotoMantenute))
      
      // Foto da rimuovere (tutte quelle esistenti NON in fotoMantenute)
      const fotoRimosse = fotoEsistenti
        .filter(foto => !fotoMantenute.includes(foto.pathname))
        .map(foto => foto.pathname)
      formData.append('foto_rimosse', JSON.stringify(fotoRimosse))
      
      // Aggiungi nuove foto come file
      Object.entries(fotoNuove).forEach(([nomeCampo, files]) => {
        files.forEach((file, index) => {
          formData.append(`foto_nuove_${nomeCampo}_${index}`, file)
        })
      })
      
      // Info su quante foto per campo
      const fotoNuoveInfo: Record<string, number> = {}
      Object.entries(fotoNuove).forEach(([nomeCampo, files]) => {
        fotoNuoveInfo[nomeCampo] = files.length
      })
      formData.append('foto_nuove_info', JSON.stringify(fotoNuoveInfo))

      console.log('📤 Submitting integrazione:', {
        campiRicompilati: Object.keys(valoriRicompilati).length,
        campiNuovi: Object.keys(valoriNuovi).length,
        fotoMantenute: fotoMantenute.length,
        fotoRimosse: fotoRimosse.length,
        fotoNuoveInfo
      })

      const response = await fetch(`/api/lavorazioni/${lavorazione.id}/completa-integrazione`, {
        method: 'PUT',
        body: formData // NO Content-Type header, browser lo aggiunge automaticamente con boundary
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('❌ Errore parsing JSON response:', jsonError)
        throw new Error(`Errore del server (${response.status}): Risposta non valida`)
      }

      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.details || 'Errore durante il completamento dell\'integrazione'
        const errorDetails = data.campi_mancanti ? `\nCampi mancanti: ${data.campi_mancanti.join(', ')}` : ''
        throw new Error(`${errorMsg}${errorDetails}`)
      }

      console.log('✅ Integrazione completata:', data)
      onSuccess()
    } catch (err) {
      console.error('❌ Errore integrazione:', err)
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto durante l\'integrazione'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderCampo = (campo: CampoRiapertura, valore: any, onChange: (val: any) => void) => {
    const commonClasses = "w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"

    switch (campo.tipo) {
      case 'text':
        return (
          <input
            type="text"
            value={valore || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={campo.descrizione || `Inserisci ${campo.label.toLowerCase()}`}
            className={commonClasses}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={valore || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={campo.descrizione || `Inserisci ${campo.label.toLowerCase()}`}
            rows={4}
            className={`${commonClasses} resize-none`}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={valore || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={campo.descrizione || `Inserisci ${campo.label.toLowerCase()}`}
            className={commonClasses}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={valore || ''}
            onChange={(e) => onChange(e.target.value)}
            className={commonClasses}
            aria-label={campo.label}
          />
        )

      case 'checkbox':
        return (
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!valore}
              onChange={(e) => onChange(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              aria-label={campo.label}
            />
            <span className="text-gray-700">{campo.descrizione || 'Seleziona'}</span>
          </label>
        )

      case 'select':
        return (
          <select
            value={valore || ''}
            onChange={(e) => onChange(e.target.value)}
            className={commonClasses}
            aria-label={campo.label}
          >
            <option value="">Seleziona...</option>
            {campo.opzioni?.map((opzione) => (
              <option key={opzione} value={opzione}>
                {opzione}
              </option>
            ))}
          </select>
        )

      case 'file':
        // Ottieni le foto mantenute per questo campo (filtra per nome campo se necessario)
        const fotoMantenuteCampo = fotoEsistenti.filter(foto => 
          fotoMantenute.includes(foto.pathname)
        )
        const nuoveFotoCampo = fotoNuove[campo.nome] || []

        return (
          <div className="space-y-3">
            {/* Foto esistenti mantenute */}
            {fotoMantenuteCampo.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  📷 Foto esistenti ({fotoMantenuteCampo.length})
                </p>
                <div className="flex flex-wrap gap-3">
                  {fotoMantenuteCampo.map((foto) => (
                    <div key={foto.pathname} className="relative group">
                      <img 
                        src={foto.url} 
                        alt={foto.nome}
                        className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          // Rimuovi da mantenute
                          setFotoMantenute(prev => prev.filter(p => p !== foto.pathname))
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                        title="Rimuovi foto"
                      >
                        ✕
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate w-24" title={foto.nome}>
                        {foto.nome}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nuove foto selezionate */}
            {nuoveFotoCampo.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  ➕ Nuove foto da caricare ({nuoveFotoCampo.length})
                </p>
                <div className="flex flex-wrap gap-3">
                  {nuoveFotoCampo.map((file, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-blue-400 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-2xl">📄</span>
                          <p className="text-xs text-gray-600 mt-1 px-1">Nuova</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // Rimuovi file dalle nuove
                          setFotoNuove(prev => ({
                            ...prev,
                            [campo.nome]: prev[campo.nome]?.filter((_, i) => i !== idx) || []
                          }))
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                        title="Rimuovi file"
                      >
                        ✕
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate w-24" title={file.name}>
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input per aggiungere nuove foto */}
            <div>
              <label 
                htmlFor={`file-input-${campo.nome}`}
                className="flex items-center justify-center gap-3 px-4 py-3 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors shadow-md"
              >
                <span className="text-2xl">📷</span>
                <span className="font-medium">
                  {fotoMantenuteCampo.length > 0 || nuoveFotoCampo.length > 0 
                    ? 'Aggiungi altre foto' 
                    : 'Scatta o scegli foto'}
                </span>
              </label>
              <input
                id={`file-input-${campo.nome}`}
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  if (files.length > 0) {
                    setFotoNuove(prev => ({
                      ...prev,
                      [campo.nome]: [...(prev[campo.nome] || []), ...files]
                    }))
                    // Reset input per permettere di ri-selezionare stesso file
                    e.target.value = ''
                  }
                }}
                className="hidden"
                aria-label={campo.label}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                {campo.descrizione || 'Puoi selezionare più foto contemporaneamente'}
              </p>
            </div>

            {/* Riepilogo totale */}
            {(fotoMantenuteCampo.length > 0 || nuoveFotoCampo.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm">
                <p className="text-blue-800">
                  <strong>Totale foto:</strong> {fotoMantenuteCampo.length + nuoveFotoCampo.length}
                  {' '}({fotoMantenuteCampo.length} esistenti + {nuoveFotoCampo.length} nuove)
                </p>
              </div>
            )}
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={valore || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={campo.descrizione || `Inserisci ${campo.label.toLowerCase()}`}
            className={commonClasses}
          />
        )
    }
  }

  const totalSteps = campiNuovi.length > 0 ? 2 : 1
  const hasCampiDaRicompilare = campiDaRicompilare.length > 0
  const hasCampiNuovi = campiNuovi.length > 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <h2 className="text-2xl font-bold">Integrazione Lavorazione</h2>
          <p className="text-blue-100 mt-1">
            {lavorazione.titolo || 'Lavorazione'}
          </p>
          
          {/* Progress indicator */}
          {totalSteps > 1 && (
            <>
              <div className="flex items-center mt-4 space-x-2">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center flex-1">
                    <div
                      className={`h-2 flex-1 rounded-full transition-all ${
                        s <= step ? 'bg-white' : 'bg-blue-300'
                      }`}
                    />
                    {s < 2 && <div className="w-2" />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className={step === 1 ? 'font-bold' : 'opacity-75'}>
                  1. Ricompila Campi
                </span>
                <span className={step === 2 ? 'font-bold' : 'opacity-75'}>
                  2. Nuovi Campi
                </span>
              </div>
            </>
          )}

          {/* Motivo riapertura alert */}
          {lavorazione.motivo_riapertura && (
            <div className="mt-4 bg-blue-600 bg-opacity-30 border border-blue-300 rounded-lg p-3">
              <p className="text-sm font-semibold">📝 Motivo della riapertura:</p>
              <p className="text-sm mt-1 text-blue-50">{lavorazione.motivo_riapertura}</p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
              <p className="font-bold">Errore</p>
              <p>{error}</p>
            </div>
          )}

          {/* Step 1: Ricompila campi */}
          {step === 1 && hasCampiDaRicompilare && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Ricompila i seguenti campi
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Questi campi necessitano di essere aggiornati. I valori precedenti sono
                  pre-compilati come riferimento.
                </p>
              </div>

              {campiDaRicompilare.map((campo) => (
                <div key={campo.nome} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <label className="block font-semibold text-gray-800 mb-1">
                        {campo.label}
                        {campo.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {campo.descrizione && (
                        <p className="text-sm text-gray-600 mb-2">{campo.descrizione}</p>
                      )}
                    </div>
                  </div>
                  
                  {renderCampo(
                    campo,
                    valoriRicompilati[campo.nome],
                    (val) => handleValoreRicompilatoChange(campo.nome, val)
                  )}

                  {campo.valore_precedente && campo.tipo !== 'file' && (
                    <div className="mt-2 text-xs text-gray-500">
                      <span className="font-semibold">Valore precedente:</span>{' '}
                      <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">
                        {Array.isArray(campo.valore_precedente) 
                          ? campo.valore_precedente.join(', ') 
                          : String(campo.valore_precedente).slice(0, 100)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Messaggio se non ci sono campi da ricompilare */}
          {step === 1 && !hasCampiDaRicompilare && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✓</div>
              <p className="text-gray-600">
                Non ci sono campi da ricompilare. Procedi con i nuovi campi.
              </p>
            </div>
          )}

          {/* Step 2: Nuovi campi */}
          {step === 2 && hasCampiNuovi && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Compila i nuovi campi
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Questi campi sono stati aggiunti dall&apos;amministratore e devono essere compilati.
                </p>
              </div>

              {campiNuovi.map((campo) => (
                <div key={campo.nome} className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <label className="block font-semibold text-gray-800 mb-1">
                        {campo.label}
                        {campo.required && <span className="text-red-500 ml-1">*</span>}
                        <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                          NUOVO
                        </span>
                      </label>
                      {campo.descrizione && (
                        <p className="text-sm text-gray-600 mb-2">{campo.descrizione}</p>
                      )}
                    </div>
                  </div>
                  
                  {renderCampo(
                    campo,
                    valoriNuovi[campo.nome],
                    (val) => handleValoreNuovoChange(campo.nome, val)
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Riepilogo */}
          {((step === 1 && !hasCampiNuovi) || step === 2) && (
            <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-blue-800 font-semibold mb-2">
                Riepilogo Integrazione
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Campi ricompilati: {Object.keys(valoriRicompilati).length}</li>
                <li>• Nuovi campi compilati: {Object.keys(valoriNuovi).length}</li>
                <li>
                  • Totale modifiche: {Object.keys(valoriRicompilati).length + Object.keys(valoriNuovi).length}
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            {step === 1 ? 'Annulla' : 'Indietro'}
          </button>
          <button
            onClick={step === 2 || !hasCampiNuovi ? handleSubmit : handleNext}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span>
              {loading
                ? 'Salvataggio...'
                : step === 2 || !hasCampiNuovi
                ? 'Completa Integrazione'
                : 'Avanti'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
