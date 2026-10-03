import { createUserOperations } from './operations'

const output = document.querySelector<HTMLPreElement>('#output')!
const app = createUserOperations((channel, trace) => {
  output.textContent += `${channel}: ${trace.join(' → ')}\n`
})

async function demo() {
  output.textContent = ''
  const request = { id: '1', token: 'demo-token' }
  for (const channel of ['users/get', 'users/get', 'profile'] as const) {
    const user = await app.run(channel, request)
    output.textContent += `response: ${JSON.stringify(user)}\n\n`
  }
  try {
    await app.run('users/get', { ...request, token: 'invalid' })
  } catch (error) {
    output.textContent += `rejected: ${(error as Error).message}\n\n`
  }
  output.textContent += `system/ping: ${await app.run('system/ping')}\n`
}

document.querySelector('#run')!.addEventListener('click', () => {
  demo().catch(error => { output.textContent += `error: ${String(error)}\n` })
})
