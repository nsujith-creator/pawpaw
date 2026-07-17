export function fixtureRunId(): string {
  const runId = process.env.PAWPAW_TEST_RUN_ID
  if (!runId) return 'pawpaw-test-default'
  if (!runId.startsWith('pawpaw-test-')) throw new Error('Invalid Pawpaw test run ID')
  return runId
}

export function fixtureEmail(suite: string, role: string): string {
  return `${fixtureRunId()}-${suite}-${role}@example.invalid`
}

export function fixtureSlug(suite: string, label: string): string {
  return `${fixtureRunId()}-${suite}-${label}`
}

export function fixtureMetadata(suite: string) {
  return { pawpaw_test_fixture: true, repository: 'pawpaw', run_id: fixtureRunId(), suite }
}

export function fixtureObjectName(label: string, extension: string): string {
  return `${fixtureRunId()}-${label}.${extension}`
}
