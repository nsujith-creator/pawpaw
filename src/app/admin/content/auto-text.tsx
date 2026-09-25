'use client'

// A text box that grows with what's written in it, so the editor reads like the page.

import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react'

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const AutoText = forwardRef<HTMLTextAreaElement, Props>(function AutoText(props, forwarded) {
  const own = useRef<HTMLTextAreaElement | null>(null)
  const grow = useCallback(() => {
    const field = own.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }, [])

  useLayoutEffect(grow, [grow, props.value])
  useLayoutEffect(() => {
    window.addEventListener('resize', grow)
    return () => window.removeEventListener('resize', grow)
  }, [grow])

  return (
    <textarea
      {...props}
      ref={element => {
        own.current = element
        if (typeof forwarded === 'function') forwarded(element)
        else if (forwarded) forwarded.current = element
      }}
    />
  )
})

export default AutoText
