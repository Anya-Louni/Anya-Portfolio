import { useState } from 'react'
import { StickyNotes } from './Accessories'
import Guestbook from './Guestbook'

/**
 * Notes.
 *
 * One app, two things you might mean by the word: notes you keep for
 * yourself on this computer, and a note you send to Anya. They used to be
 * two apps with two names, which only made people guess which was which.
 */

type Tab = 'mine' | 'send'

export default function Notes() {
  const [tab, setTab] = useState<Tab>('mine')

  return (
    <div className="nt">
      <div className="nt__tabs" role="tablist">
        <button
          className="nt__tab"
          role="tab"
          aria-selected={tab === 'mine'}
          data-on={tab === 'mine'}
          onClick={() => setTab('mine')}
        >
          My notes
        </button>
        <button
          className="nt__tab"
          role="tab"
          aria-selected={tab === 'send'}
          data-on={tab === 'send'}
          onClick={() => setTab('send')}
        >
          Send one to Anya
        </button>
      </div>

      <div className="nt__panel">{tab === 'mine' ? <StickyNotes /> : <Guestbook />}</div>
    </div>
  )
}
