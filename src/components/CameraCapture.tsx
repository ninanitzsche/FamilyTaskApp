import { useRef, useState, useEffect } from 'react'
import { Camera, X, Image as ImageIcon } from 'lucide-react'

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void
  onClose: () => void
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [started, setStarted] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const handleStart = async () => {
    if (starting) return
    setStarting(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Kamera nicht verfügbar')
        return
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setStarted(true)
    } catch {
      setError('Kamera nicht verfügbar')
    } finally {
      setStarting(false)
    }
  }

  const handleCapture = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      onCapture(dataUrl)
    } catch (error) {
      console.error('Capture failed:', error)
      setError('Foto konnte nicht aufgenommen werden')
    }
  }

  const handleGalleryFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onCapture(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleClose = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    onClose()
  }

  if (error) {
    return (
      <div role="dialog" aria-modal="true" aria-labelledby="camera-error-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="mx-6 w-full max-w-sm rounded-[24px] bg-white p-8 text-center">
          <p className="mb-4 text-[48px]">📸</p>
          <h2 id="camera-error-title" className="mb-2 text-[16px] font-bold text-ink">{error}</h2>
          <p className="mb-6 text-[13px] text-ink-soft">Ein Foto aus der Galerie geht trotzdem!</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-coral to-coral-deep py-3 text-[14px] font-bold text-white shadow-md active:scale-[0.97]"
            >
              <ImageIcon className="h-4 w-4" />
              Aus Galerie wählen
            </button>
            <button
              onClick={handleClose}
              className="rounded-2xl bg-wash-plum px-6 py-3 text-[14px] font-bold text-ink-soft"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div role="dialog" aria-modal="true" aria-labelledby="camera-start-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="mx-6 w-full max-w-sm rounded-[24px] bg-white p-8 text-center">
          <p className="mb-4 text-[48px]">📸</p>
          <h2 id="camera-start-title" className="mb-2 text-[20px] font-black text-ink">
            Foto aufnehmen
          </h2>
          <p className="mb-6 text-[14px] font-semibold text-ink-soft">
            Wir brauchen die Kamera für dein Vorher-Foto.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleStart}
              disabled={starting}
              className="rounded-2xl bg-gradient-to-br from-coral to-coral-deep py-3 text-[14px] font-bold text-white shadow-md transition-all active:scale-[0.97] disabled:opacity-40"
            >
              {starting ? 'Starte…' : 'Kamera starten'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-wash-plum py-3 text-[14px] font-bold text-ink-soft"
            >
              <ImageIcon className="h-4 w-4" />
              Aus Galerie wählen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="camera-title" className="fixed inset-0 z-50 flex flex-col bg-black">
      <h2 id="camera-title" className="sr-only">Foto aufnehmen</h2>
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        <button
          onClick={handleClose}
          aria-label="Kamera schließen"
          className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white active:scale-[0.97]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-6 bg-black py-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-[13px] font-bold text-white active:scale-95"
        >
          <ImageIcon className="h-4 w-4" />
          Galerie
        </button>
        <button
          onClick={handleCapture}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg transition-transform active:scale-95"
        >
          <Camera className="h-7 w-7 text-ink" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleGalleryFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}