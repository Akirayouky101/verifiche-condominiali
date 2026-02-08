import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 1. Verifica se le colonne esistono
    const { data: columns, error: colError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, column_default
          FROM information_schema.columns
          WHERE table_name = 'lavorazioni'
          AND column_name IN ('lavorazione_originale_id', 'motivo_integrazione', 'campi_nuovi', 'dati_verifiche', 'id_cartella', 'data_integrazione')
          ORDER BY column_name;
        `
      })

    if (colError) {
      console.log('⚠️ Non posso usare RPC, provo query diretta')
    }

    // 2. Cerca tutte le integrazioni
    const { data: integrazioni, error: integError } = await supabase
      .from('lavorazioni')
      .select('*')
      .eq('stato', 'integrazione')
      .order('created_at', { ascending: false })
      .limit(5)

    // 3. Cerca lavorazioni con lavorazione_originale_id non null
    const { data: integrazioniAlt, error: integAltError } = await supabase
      .from('lavorazioni')
      .select('id, titolo, stato, campi_nuovi, lavorazione_originale_id, created_at')
      .not('lavorazione_originale_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      message: '🔍 Diagnostica Database Integrazione',
      columns: columns || 'Non disponibile (usa SQL Editor per verificare)',
      integrazioni_per_stato: {
        count: integrazioni?.length || 0,
        data: integrazioni || [],
        error: integError?.message || null
      },
      integrazioni_per_link: {
        count: integrazioniAlt?.length || 0,
        data: integrazioniAlt || [],
        error: integAltError?.message || null
      },
      note: [
        '📌 Se "integrazioni_per_link.count" è 0, le colonne non esistono ancora',
        '📌 Se "campi_nuovi" è null nelle integrazioni, la colonna esiste ma i dati non sono salvati',
        '📌 Esegui SETUP_INTEGRAZIONE.sql su Supabase SQL Editor se i conteggi sono 0'
      ]
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Errore durante il test',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
