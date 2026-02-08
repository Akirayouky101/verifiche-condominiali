import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering - this API uses request.url
export const dynamic = 'force-dynamic'

/**
 * API Proxy per scaricare immagini lato server
 * Risolve problemi CORS per:
 * - Mappe OpenStreetMap
 * - Immagini Vercel Blob
 * - Qualsiasi immagine esterna
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL parametro mancante' },
        { status: 400 }
      )
    }

    console.log('📥 Proxy download immagine:', imageUrl.substring(0, 100))
    
    // Scarica l'immagine lato server (no CORS)
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VerificheCondominiali/1.0)',
      },
      // Timeout di 10 secondi
      signal: AbortSignal.timeout(10000)
    })
    
    if (!response.ok) {
      console.error('❌ Errore download:', response.status, response.statusText)
      return NextResponse.json(
        { error: `HTTP ${response.status}: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const blob = await response.blob()
    console.log('✅ Immagine scaricata:', blob.size, 'bytes, tipo:', blob.type)
    
    // Converti in base64
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    
    // Determina MIME type
    const mimeType = blob.type || 'image/png'
    const dataUrl = `data:${mimeType};base64,${base64}`
    
    // Ritorna come JSON con data URL
    return NextResponse.json({
      success: true,
      dataUrl: dataUrl,
      size: blob.size,
      type: mimeType
    })
    
  } catch (error) {
    console.error('❌ Errore proxy immagine:', error)
    return NextResponse.json(
      { 
        error: 'Errore download immagine',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
