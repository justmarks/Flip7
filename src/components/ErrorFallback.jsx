export function ErrorFallback({ error }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h2>Something went wrong</h2>
      <pre style={{ fontSize: 12, opacity: 0.6 }}>{error?.message}</pre>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  )
}
