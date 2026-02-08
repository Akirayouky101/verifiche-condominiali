'use client'

import { useState } from 'react'
import { Lavorazione } from '@/lib/types'

interface WizardIntegrazioneProps {
  lavorazione: Lavorazione
  adminId: string
  onClose: () => void
  onSuccess: () => void
}

export default function WizardIntegrazione({ 
  lavorazione, 
  adminId, 
  onClose, 
  onSuccess 
}: WizardIntegrazioneProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Step 1: Motivo integrazione
  const [motivoIntegrazione, setMotivoIntegrazione] = useState('')
  
  // Step 2: Campi da aggiungere
  const [campiNuovi, setCampiNuovi] = useState<Array<{
    nome: string
    label: string
    tipo: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'file'
    required: boolean
    descrizione?: string
    opzioni?: string[]
  }>>([])

  const aggiungiCampo = () => {
    setCampiNuovi([
      ...campiNuovi,
      {
        nome: `campo_${Date.now()}`,
        label: '',
        tipo: 'text',
        required: false
      }
    ])
  }

  const rimuoviCampo = (index: number) => {
    setCampiNuovi(campiNuovi.filter((_, i) => i !== index))
  }

  const aggiornaCampo = (index: number, field: string, value: any) => {
    const nuoviCampi = [...campiNuovi]
    nuoviCampi[index] = { ...nuoviCampi[index], [field]: value }
    setCampiNuovi(nuoviCampi)
  }

  const handleCreaIntegrazione = async () => {
    // Validazione
    if (!motivoIntegrazione.trim()) {
      setError('Inserisci il motivo dell\'integrazione')
      return
    }

    if (campiNuovi.length === 0) {
      setError('Aggiungi almeno un campo da compilare')
      return
    }

    // Valida campi
    for (const campo of campiNuovi) {
      if (!campo.label.trim()) {
        setError('Tutti i campi devono avere un\'etichetta')
        return
      }
      if (campo.tipo === 'select' && (!campo.opzioni || campo.opzioni.length === 0)) {
        setError(`Il campo "${campo.label}" di tipo select deve avere almeno un'opzione`)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/lavorazioni/${lavorazione.id}/crea-integrazione`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo_integrazione: motivoIntegrazione,
          campi_nuovi: campiNuovi,
          admin_id: adminId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore durante la creazione dell\'integrazione')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
          <h2 className="text-2xl font-bold">Crea Integrazione</h2>
          <p className="text-green-100 mt-1">
            Lavorazione: {lavorazione.titolo || 'N/A'}
          </p>
          
          {/* Progress indicator */}
          <div className="flex items-center mt-4 space-x-2">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`h-2 flex-1 rounded-full transition-all ${
                    s <= step ? 'bg-white' : 'bg-green-300'
                  }`}
                />
                {s < 2 && <div className="w-2" />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className={step === 1 ? 'font-bold' : 'opacity-75'}>
              1. Motivo Integrazione
            </span>
            <span className={step === 2 ? 'font-bold' : 'opacity-75'}>
              2. Campi da Aggiungere
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
              <p className="font-bold">Errore</p>
              <p>{error}</p>
            </div>
          )}

          {/* Step 1: Motivo */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Perché serve questa integrazione?
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Spiega al sopralluoghista cosa deve integrare e perché.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-800 mb-2">
                  Motivo dell&apos;integrazione <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivoIntegrazione}
                  onChange={(e) => setMotivoIntegrazione(e.target.value)}
                  rows={4}
                  placeholder="Es: Mancano le foto del seminterrato, necessarie per completare la verifica..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 2: Campi */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Campi da Aggiungere
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Definisci quali nuovi campi deve compilare il sopralluoghista.
                </p>
              </div>

              {campiNuovi.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 mb-4">Nessun campo aggiunto</p>
                  <button
                    onClick={aggiungiCampo}
                    className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    ➕ Aggiungi Primo Campo
                  </button>
                </div>
              )}

              {campiNuovi.map((campo, index) => (
                <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-800">Campo {index + 1}</h4>
                    <button
                      onClick={() => rimuoviCampo(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      🗑️ Rimuovi
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Etichetta Campo *
                      </label>
                      <input
                        type="text"
                        value={campo.label}
                        onChange={(e) => aggiornaCampo(index, 'label', e.target.value)}
                        placeholder="Es: Foto Seminterrato"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo Campo
                      </label>
                      <select
                        value={campo.tipo}
                        onChange={(e) => aggiornaCampo(index, 'tipo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      >
                        <option value="text">Testo breve</option>
                        <option value="textarea">Testo lungo</option>
                        <option value="number">Numero</option>
                        <option value="select">Selezione</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="file">File/Foto</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrizione/Istruzioni
                      </label>
                      <input
                        type="text"
                        value={campo.descrizione || ''}
                        onChange={(e) => aggiornaCampo(index, 'descrizione', e.target.value)}
                        placeholder="Es: Scatta foto di tutti i locali del seminterrato"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    {campo.tipo === 'select' && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Opzioni (separate da virgola)
                        </label>
                        <input
                          type="text"
                          value={campo.opzioni?.join(', ') || ''}
                          onChange={(e) => aggiornaCampo(index, 'opzioni', e.target.value.split(',').map(s => s.trim()))}
                          placeholder="Es: Sì, No, Parziale"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    )}

                    <div className="col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={campo.required}
                          onChange={(e) => aggiornaCampo(index, 'required', e.target.checked)}
                          className="w-5 h-5 text-green-500 rounded"
                        />
                        <span className="text-sm text-gray-700">Campo obbligatorio</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              {campiNuovi.length > 0 && (
                <button
                  onClick={aggiungiCampo}
                  className="w-full bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors border border-green-300"
                >
                  ➕ Aggiungi Altro Campo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Annulla
          </button>

          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                ← Indietro
              </button>
            )}

            {step < 2 ? (
              <button
                onClick={() => setStep(2)}
                disabled={!motivoIntegrazione.trim()}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Avanti →
              </button>
            ) : (
              <button
                onClick={handleCreaIntegrazione}
                disabled={loading || campiNuovi.length === 0}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span> Creazione...
                  </>
                ) : (
                  <>✅ Crea Integrazione</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
