import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
        if (!isAdmin) {
          return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    const body = await req.json().catch(() => ({}))
    const { source_ids } = body // optional: scrape specific sources only

    // Get sources to scrape
    let query = supabase.from('hot_news_sources').select('*').eq('is_enabled', true)
    if (source_ids?.length) {
      query = query.in('id', source_ids)
    }
    const { data: sources, error: srcErr } = await query
    if (srcErr || !sources?.length) {
      return new Response(JSON.stringify({ success: false, error: srcErr?.message || 'No sources found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: any[] = []
    const today = new Date().toISOString().split('T')[0]

    for (const source of sources) {
      try {
        console.log(`Scraping ${source.name}: ${source.url}`)

        const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: source.url,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        })

        const scrapeData = await scrapeRes.json()
        if (!scrapeRes.ok || !scrapeData.success) {
          console.error(`Failed to scrape ${source.name}:`, scrapeData)
          results.push({ source: source.name, status: 'error', error: scrapeData.error || 'Scrape failed' })
          continue
        }

        const markdown = scrapeData.data?.markdown || scrapeData.markdown || ''
        if (!markdown) {
          results.push({ source: source.name, status: 'empty' })
          continue
        }

        // Use AI to extract structured news from the markdown
        const extractRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: source.url,
            formats: [{ 
              type: 'json', 
              prompt: `Extract the ${source.max_items} most recent news/blog post headlines from this page. For each item provide: title (the headline), content (a 1-2 sentence summary), and up to 3 keywords. If there are fewer items available, return what you find. Return as array of objects with title, content, keywords fields. Keywords should be an array of strings.`,
              schema: {
                type: 'object',
                properties: {
                  news: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        content: { type: 'string' },
                        keywords: { type: 'array', items: { type: 'string' } },
                      },
                      required: ['title', 'content'],
                    },
                  },
                },
                required: ['news'],
              },
            }],
            onlyMainContent: true,
          }),
        })

        const extractData = await extractRes.json()
        const newsItems = extractData.data?.json?.news || extractData.json?.news || []

        if (newsItems.length === 0) {
          results.push({ source: source.name, status: 'no_news_extracted' })
          continue
        }

        // Insert news items
        const inserts = newsItems.slice(0, source.max_items).map((item: any) => ({
          source_name: source.name,
          source_url: source.url,
          title: item.title || 'Untitled',
          content: item.content || '',
          keywords: (item.keywords || source.keywords || []).slice(0, 3),
          news_date: today,
        }))

        // Delete old news for this source from today to avoid duplicates
        await supabase.from('hot_news').delete().eq('source_name', source.name).eq('news_date', today)

        const { error: insertErr } = await supabase.from('hot_news').insert(inserts)
        if (insertErr) {
          console.error(`Insert error for ${source.name}:`, insertErr)
          results.push({ source: source.name, status: 'insert_error', error: insertErr.message })
        } else {
          results.push({ source: source.name, status: 'ok', count: inserts.length })
        }
      } catch (err) {
        console.error(`Error processing ${source.name}:`, err)
        results.push({ source: source.name, status: 'error', error: String(err) })
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
