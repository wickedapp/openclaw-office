// Database Viewer API
// Allows browsing SQLite tables, rows, and running read-only queries

import db from '../../../lib/db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'tables'
  const table = searchParams.get('table')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset = parseInt(searchParams.get('offset') || '0')
  const query = searchParams.get('query')

  try {
    // List all tables
    if (action === 'tables') {
      const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
      `).all()

      const tableInfo = tables.map(t => {
        const count = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get()
        const columns = db.prepare(`PRAGMA table_info("${t.name}")`).all()
        return {
          name: t.name,
          rowCount: count.count,
          columns: columns.map(c => ({
            name: c.name,
            type: c.type,
            pk: c.pk === 1,
            notNull: c.notnull === 1,
            defaultValue: c.dflt_value,
          })),
        }
      })

      return Response.json({ tables: tableInfo })
    }

    // Browse table rows
    if (action === 'browse' && table) {
      // Validate table name exists
      const tableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(table)
      if (!tableExists) {
        return Response.json({ error: `Table "${table}" not found` }, { status: 404 })
      }

      const total = db.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get().count
      const columns = db.prepare(`PRAGMA table_info("${table}")`).all()
      const rows = db.prepare(`SELECT * FROM "${table}" ORDER BY rowid DESC LIMIT ? OFFSET ?`).all(limit, offset)

      return Response.json({
        table,
        columns: columns.map(c => c.name),
        columnTypes: columns.map(c => c.type),
        rows,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      })
    }

    // Run read-only query
    if (action === 'query' && query) {
      // Only allow SELECT statements
      const trimmed = query.trim().toUpperCase()
      if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('PRAGMA')) {
        return Response.json({ error: 'Only SELECT and PRAGMA queries are allowed' }, { status: 400 })
      }

      // Block dangerous keywords
      const blocked = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'ATTACH', 'DETACH']
      for (const keyword of blocked) {
        if (trimmed.includes(keyword)) {
          return Response.json({ error: `Query contains blocked keyword: ${keyword}` }, { status: 400 })
        }
      }

      const rows = db.prepare(query).all()
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []

      return Response.json({
        query,
        columns,
        rows: rows.slice(0, limit),
        total: rows.length,
        truncated: rows.length > limit,
      })
    }

    // DB stats
    if (action === 'stats') {
      const size = db.prepare(`PRAGMA page_count`).get()
      const pageSize = db.prepare(`PRAGMA page_size`).get()
      const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all()
      
      const dbSizeBytes = (size?.page_count || 0) * (pageSize?.page_size || 4096)

      return Response.json({
        sizeBytes: dbSizeBytes,
        sizeFormatted: dbSizeBytes > 1048576 
          ? `${(dbSizeBytes / 1048576).toFixed(2)} MB`
          : `${(dbSizeBytes / 1024).toFixed(1)} KB`,
        tableCount: tables.length,
        walMode: db.pragma('journal_mode')[0]?.journal_mode === 'wal',
      })
    }

    return Response.json({ error: 'Invalid action. Use: tables, browse, query, stats' }, { status: 400 })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
