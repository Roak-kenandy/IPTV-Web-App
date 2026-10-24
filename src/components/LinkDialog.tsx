import { useApp, useRemote } from '../remote'
import { Qr } from './common'

export default function LinkDialog({ title, url, onClose }: { title: string; url: string; onClose: () => void }) {
  const { content } = useApp()
  useRemote((key) => {
    if (key === 'back' || key === 'ok') onClose()
  })
  return (
    <div className="dialog" onClick={onClose}>
      <div className="dialog__box" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <Qr value={url} size={320} />
        <p className="dialog__url">{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
        <p className="dialog__hint">Scan the QR Code with your phone to open the link</p>
        <p className="dialog__back">{content.drawerBackText}</p>
      </div>
    </div>
  )
}
