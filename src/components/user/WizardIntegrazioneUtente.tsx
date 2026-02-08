'use client'

import { useState, useEffect } from 'react'
import { Lavorazione } from '@/lib/types'

interface WizardIntegrazioneUtenteProps {
  lavorazione: Lavorazione
  onClose: () => void
  onSuccess: () => void
}

export default function WizardIntegrazioneUtente({ 
  lavorazione, 
  onClose, 
  onSuccess 
}: WizardIntegrazioneUtenteProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [valoriCampi, setValoriCampi] = useState<Record<string, any>>({})
  const [fotoNuove, setFotoNuove] = useState<Record<string, File[]>>({})

  // Parsing campi nuovi dalla lavorazione
  const campiNuovi = Array.isArray(lavorazione.campi_nuovi) 
    ? lavorazione.campi_nuovi 
    : []

  const handleValoreChange = (nomeCampo: string, valore: any) => {
    setValoriCampi(prev => ({
      ...prev,
      [nomeCampo]: valore
    }))
  }

  const handleSubmit = async () => {
    // Validazione
    for (const campo of campiNuovi) {
      if (campo.required) {
        const valore = valoriCampi[campo.nome]
        const fotoDelCampo = fotoNuove[campo.nome]
        
        if (campo.tipo === 'file') {
          if (!fotoDelCampo || fotoDelCampo.length === 0) {
            setError(`Il campo "${campo.label}" è obbligatorio`)
            return
          }
        } else if (!valore || (typeof valore === 'string' && !valore.trim())) {
          setError(`Il campo "${campo.label}" è obbligatorio`)
          return
        }
      }
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      
      // Aggiungi valori campi (come JSON)
      formData.append('dati_verifiche', JSON.stringify(valoriCampi))
      
      // Aggiungi foto
      const fotoInfo: Record<string, number> = {}
      for (const [nomeCampo, files] of Object.entries(fotoNuove)) {
        files.forEach((file, index) => {
          formData.append(`foto_${nomeCampo}_${index}`, file)
        })
        fotoInfo[nomeCampo] = files.length
      }
      formData.append('foto_info', JSON.stringify(fotoInfo))

      const response = await fetch(`/api/lavorazioni/${lavorazione.id}/completa-integrazione-nuova`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore durante il completamento')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderCampo = (campo: any) => {
    const valore = valoriCampi[campo.nome]

    switch (campo.tipo) {
      case 'textarea':
        return (
          <textarea
            value={valore || ''}
            onChange={(e) => handleValoreChange(campo.nome, e.target.value)}
            rows={4}
            placeholder={campo.descrizione || `Inserisci ${campo.label.toLowerCase()}`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={valore || ''}
            onChange={(e) => handleValoreChange(campo.nome, e.target.value)}
            placeholder={campo.descrizione || `Inserisci ${campo.label.toLowerCase()}`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )

      case 'checkbox':
        return (
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={!!valore}
              onChange={(e) => handleValoreChange(campo.nome, e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">{campo.descrizione || 'Seleziona'}</span>
          </label>
        )

      case 'select':
        return (
          <select
            value={valore || ''}
            onChange={(e) => handleValoreChange(campo.nome, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seleziona...</option>
            {campo.opzioni?.map((opzione: string) => (
              <option key={opzione} value={opzione}>
                {opzione}
              </option>
            ))}
          </select>
        )

      case 'file':
        const nuoveFotoCampo = fotoNuove[campo.nome] || []
        
        return (
          <div className="space-y-3">
            {/* Nuove foto selezionate */}
            {nuoveFotoCampo.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  📷 Foto selezionate ({nuoveFotoCampo.length})
                </p>
                <div className="flex flex-wrap gap-3">
                  {nuoveFotoCampo.map((file, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-blue-400 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-2xl">📄</span>
                          <p className="text-xs text-gray-600 mt-1 px-1">Foto {idx + 1}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
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

            {/* Input per aggiungere foto */}
            <div>
              <label 
                htmlFor={`file-input-${campo.nome}`}
                className="flex items-center justify-center gap-3 px-4 py-3 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors shadow-md"
              >
                <span className="text-2xl">📷</span>
                <span className="font-medium">
                  {nuoveFotoCampo.length > 0 ? 'Aggiungi altre foto' : 'Scatta o scegli foto'}
                </span>
              </label>
              <input
                id={`file-input-${campo.nome}`}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  if (files.length > 0) {
                    setFotoNuove(prev => ({
                      ...prev,
                      [campo.nome]: [...(prev[campo.nome] || []), ...files]
                    }))
                    e.target.value = ''
                  }
                }}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                {campo.descrizione || 'Puoi selezionare più foto contemporaneamente'}
              </p>
            </div>
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={valore || ''}
            onChange={(e) => handleValoreChange(campo.nome, e.target.value)}
            placeholder={campo.descrizione || `Inserisci ${campo.label.toLowerCase()}`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <h2 className="text-2xl font-bold">Completa Integrazione</h2>
          <p className="text-blue-100 mt-1">
            {lavorazione.titolo || 'Lavorazione'}
          </p>
          
          {/* Motivo integrazione */}
          {lavorazione.motivo_integrazione && (
            <div className="mt-4 bg-blue-600 bg-opacity-30 border border-blue-300 rounded-lg p-3">
              <p className="text-sm font-semibold">📝 Motivo dell&apos;integrazione:</p>
              <p className="text-sm mt-1 text-blue-50">{lavorazione.motivo_integrazione}</p>
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

          {campiNuovi.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nessun campo da compilare</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Campi da Compilare
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Compila tutti i campi richiesti dall&apos;amministratore
                </p>
              </div>

              {campiNuovi.map((campo: any) => (
                <div key={campo.nome} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="mb-3">
                    <label className="block font-semibold text-gray-800 mb-1">
                      {campo.label}
                      {campo.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {campo.descrizione && campo.tipo !== 'file' && (
                      <p className="text-sm text-gray-600 mb-2">{campo.descrizione}</p>
                    )}
                  </div>
                  
                  {renderCampo(campo)}
                </div>
              ))}
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

          <button
            onClick={handleSubmit}
            disabled={loading || campiNuovi.length === 0}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Invio...
              </>
            ) : (
              <>✅ Completa Integrazione</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
