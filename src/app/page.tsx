export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#333' }}>
          Welcome to Hubbly
        </h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '2rem', color: '#666' }}>
          Real-time Q&A platform for events, meetings, and presentations
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem' }}>
          <button 
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Create Session
          </button>
          <button 
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: '#fff',
              color: '#0070f3',
              border: '2px solid #0070f3',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Join Session
          </button>
        </div>

        <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>
            How it works:
          </h2>
          <ol style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#555' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Hosts:</strong> Create a session and get a 6-digit code to share
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Audience:</strong> Join with the code and submit questions anonymously
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Engage:</strong> Vote on questions and see answers in real-time
            </li>
          </ol>
        </div>
      </div>
    </main>
  )
}