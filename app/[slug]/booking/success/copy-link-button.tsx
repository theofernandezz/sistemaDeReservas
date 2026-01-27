'use client'

import { useState } from 'react'
import { Copy, Check, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CopyLinkButtonProps {
  link: string
}

export default function CopyLinkButton({ link }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Link para gestionar tu turno
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Guardá este link para reprogramar o cancelar tu turno cuando lo necesites
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 px-3 py-2 bg-white dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded text-xs text-blue-900 dark:text-blue-100 truncate">
              {link}
            </code>
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className={cn(
                "shrink-0 gap-2 transition-all",
                copied && "bg-green-50 border-green-300 text-green-700 dark:bg-green-950/30 dark:border-green-700 dark:text-green-400"
              )}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
