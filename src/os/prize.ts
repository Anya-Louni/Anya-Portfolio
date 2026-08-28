/**
 * What a game pays.
 *
 * Winning anything on this desktop puts coins in the same purse the aquarium
 * spends, so an evening of Solitaire buys a clownfish. The numbers are set
 * against the tank's ladder rather than against each other: a hand of
 * Solitaire is a couple of guppies, and clearing four-suit Spider is most of
 * the way to an angelfish.
 *
 * A game may only pay once per deal. Every caller passes a token that changes
 * when a new game starts, and a second call with the same token pays nothing —
 * otherwise a component re-rendering after the win would pay again, which is
 * exactly what happened the first time this was wired up.
 */
import { addCoins, coinText } from './purse'
import { useOS } from './store'

const paid = new Set<string>()

export function prize(token: string, amount: number, what: string) {
  if (!amount || paid.has(token)) return
  paid.add(token)
  // the set is only a guard against a double render, not a save file
  if (paid.size > 200) paid.clear()
  addCoins(amount)
  useOS.getState().pushToast({
    title: `+${coinText(amount)} coins`,
    body: what,
    icon: 'star',
  })
}
