'use client'

import { useEffect, useState } from 'react'
import { Lavorazione } from '@/lib/types'

interface IntegrazioniCollegateProps {
  lavorazioneId: string
}

export default function IntegrazioniCollegate({ lavorazioneId }: IntegrazioniCollegateProps) {
  const [integrazioni, setIntegrazioni] = useState<Lavorazione[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchIntegrazioni = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/lavorazioni?lavorazione_originale_id=${lavorazioneId}`)
        const data = await response.json()
        
        if (data.success) {
          setIntegrazioni(data.lavorazioni || [])
        }
      } catch (error) {
        console.error('Errore nel caricamento integrazioni:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchIntegrazioni()
  }, [lavorazioneId])

  if (loading) {
    return (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Integrazioni Collegate</h3>
        <div className="text-center py-4 text-gray-500">Caricamento...</div>
      </div>
    )
  }

  if (integrazioni.length === 0) {
    return null
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Integrazioni Collegate</h3>
      <div className="space-y-3">
        {integrazioni.map((integrazione) => {
          const statoColor = integrazione.stato === 'completata' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-blue-50 border-blue-200 text-blue-800'
          
          const statoIcon = integrazione.stato === 'completata' ? '✅' : '⚡'
          
          return (
            <div 
              key={integrazione.id}
              className={`p-4 rounded-lg border-2 ${statoColor}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xl">{statoIcon}</span>
                    <div className="font-semibold">
                      Integrazione #{integrazione.id.substring(0, 8)}...
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      integrazione.stato === 'completata' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {integrazione.stato === 'completata' ? 'Completata' : 'In corso'}
                    </span>
                  </div>
                  
                  {integrazione.motivo_integrazione && (
                    <div className="text-sm mb-2">
                      <span className="font-medium">Motivo:</span> {integrazione.motivo_integrazione}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Creata:</span>{' '}
                    {integrazione.data_apertura 
                      ? new Date(integrazione.data_apertura).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/D'}
                  </div>
                  
                  {integrazione.stato === 'completata' && integrazione.data_integrazione && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Completata:</span>{' '}
                      {new Date(integrazione.data_integrazione).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}

                  {/* Campi richiesti */}
                  {integrazione.campi_nuovi && Array.isArray(integrazione.campi_nuovi) && integrazione.campi_nuovi.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        Campi richiesti: {integrazione.campi_nuovi.length}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {integrazione.campi_nuovi.slice(0, 3).map((campo: any, idx: number) => (
                          <span 
                            key={idx}
                            className="text-xs px-2 py-1 bg-white rounded-full border border-gray-300"
                          >
                            {campo.label || campo.nome || `Campo ${idx + 1}`}
                          </span>
                        ))}
                        {integrazione.campi_nuovi.length > 3 && (
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                            +{integrazione.campi_nuovi.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Badge assegnato */}
                {integrazione.users && (
                  <div className="ml-3 text-xs bg-white px-2 py-1 rounded-full border border-gray-300">
                    👤 {integrazione.users.nome} {integrazione.users.cognome?.charAt(0)}.
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {integrazioni.length > 0 && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          {integrazioni.length} {integrazioni.length === 1 ? 'integrazione trovata' : 'integrazioni trovate'}
        </div>
      )}
    </div>
  )
}
