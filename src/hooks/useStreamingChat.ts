'use client'

import { useState, useRef } from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function useStreamingChat() {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setIsLoading(true)
    setError(null)

    const assistantId = `a-${Date.now()}`
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`Error ${res.status}`)
      if (!res.body) throw new Error('No stream')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        if (text) {
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: m.content + text } : m)
          )
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e)
        setMessages(prev => prev.filter(m => m.id !== assistantId))
      }
    } finally {
      setIsLoading(false)
    }
  }

  function reload() {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    const idx = messages.indexOf(lastUser)
    setMessages(messages.slice(0, idx + 1).filter(m => m.role !== 'assistant' || messages.indexOf(m) < idx))
    sendMessage(lastUser.content)
  }

  function clearMessages() {
    setMessages([])
    setError(null)
  }

  return { messages, input, setInput, isLoading, error, sendMessage, reload, clearMessages }
}
