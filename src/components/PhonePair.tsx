import { remoteUrl, usePhoneRemoteState } from '../phone'
import { Qr } from './common'

/** QR code that opens the phone remote page, paired with this screen. */
export default function PhonePair() {
  const { id, phones } = usePhoneRemoteState()
  if (!id) return null
  return (
    <div className="phonepair">
      <Qr value={remoteUrl(id)} size={150} />
      <div className="phonepair__text">
        <b>{phones > 0 ? 'Phone remote connected' : 'Use your phone as the remote'}</b>
        <span>{phones > 0 ? 'Scan again to add another phone' : 'Scan the QR code with your phone camera'}</span>
      </div>
    </div>
  )
}
