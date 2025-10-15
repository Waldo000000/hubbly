const { Client } = require('pg')

async function dropPublicSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    console.log('🔗 Connected to database')
    
    // Drop public schema and recreate it
    console.log('💀 Dropping public schema...')
    await client.query('DROP SCHEMA IF EXISTS public CASCADE')
    
    console.log('🏗️  Creating fresh public schema...')
    await client.query('CREATE SCHEMA public')
    
    // Grant permissions back to postgres user
    await client.query('GRANT ALL ON SCHEMA public TO postgres')
    await client.query('GRANT ALL ON SCHEMA public TO public')
    
    console.log('✅ Public schema reset complete')
    
  } catch (error) {
    console.error('❌ Error dropping schema:', error.message)
    throw error
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  dropPublicSchema().catch(error => {
    console.error('Failed to drop schema:', error)
    process.exit(1)
  })
}

module.exports = { dropPublicSchema }