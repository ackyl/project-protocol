import {
  cargo,
  cargoIds,
  deckName,
  rules,
  slots,
  type CargoId,
} from '../game/content'
import { itemPayout } from '../game/customs'
import { mobile, shielded, type Game } from '../game/simulation'
import { Icon } from './Icon'
function locationText(g: Game, id: CargoId) {
  const loc = g.items[id].location
  if (loc.kind === 'surrendered') return 'Surrendered'
  if (g.outcome)
    return { arrest: 'Impounded', death: 'Lost', delivered: 'Delivered' }[
      g.outcome
    ]
  if (loc.kind === 'slot') return slots[loc.slot].name
  if (loc.kind === 'loose') return deckName(loc.floor) + ' · Loose'
  return 'In hand'
}
export function Manifest({ game }: { game: Game }) {
  return (
    <section className="panel manifest">
      <div className="panel-title">
        <Icon name="manifest" />
        <h2>Cargo manifest</h2>
        <span className="tag">02 ITEMS</span>
      </div>
      <div className="items">
        {cargoIds.map((id) => {
          const item = game.items[id],
            loc = item.location,
            thermal = cargo[id].kind === 'thermal'
          const where = locationText(game, id)
          return (
            <div className={'item ' + id} key={id}>
              <span className="item-art">
                <Icon name={thermal ? 'bolt' : 'signal'} size={28} />
              </span>
              <div>
                <h3>{cargo[id].name}</h3>
                <small>
                  {thermal
                    ? item.heat >= rules.surgeHeat
                      ? 'VENT RISK'
                      : 'THERMAL RISK'
                    : 'SCAN RISK'}
                </small>
              </div>
              <strong className="price">
                {loc.kind === 'surrendered' ||
                (game.phase === 'result' && game.outcome !== 'delivered')
                  ? 0
                  : itemPayout(game, id)}{' '}
                <small>CR</small>
              </strong>
              <div className="item-info">
                {where}
                {game.phase !== 'result' &&
                  game.phase !== 'contract' &&
                  loc.kind !== 'surrendered' && (
                    <>
                      <br />
                      {thermal
                        ? `Heat ${Math.floor(item.heat)}% · Cond. ${item.condition}%`
                        : shielded(item)
                          ? 'Signal masked'
                          : 'Broadcast exposed'}
                    </>
                  )}
              </div>
              {thermal && mobile(game) && (
                <meter
                  aria-label="Cell instability"
                  value={item.heat}
                  min="0"
                  max={rules.heatLimit}
                />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
