async function main() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(5_000) });
  const body = await response.json();
  if (!response.ok || !body.ok) {
    throw new Error(`Health check failed (${response.status}): ${JSON.stringify(body)}`);
  }
  console.log(`Health OK: ${body.database}, ${body.latencyMs}ms`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
