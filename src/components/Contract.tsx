import { cargo, cargoIds, rules } from '../game/content'
import { Icon } from './Icon'
export function Contract({ accept }: { accept: () => void }) {
  return (
    <section className="panel contract">
      <div className="panel-title">
        <Icon name="doc" />
        <h2>Contract briefing</h2>
        <span className="tag">#071</span>
      </div>
      <div className="contract-body">
        <p className="kicker amber">SYNDICATE FREIGHT</p>
        <h2>The Cinder Run</h2>
        <p className="desc">
          Haul two pieces of contraband through the Ash Belt. Keep the hull
          intact and clear customs at Cinder Gate.
        </p>
        <div className="route">
          <div>
            <i className="origin" />
            <small>ORIGIN</small>
            <b>Relay Nine</b>
          </div>
          <div>
            <i className="dest" />
            <small>DESTINATION</small>
            <b>Cinder Gate</b>
          </div>
        </div>
        <div className="fees">
          <span>
            Contract value{' '}
            <b>
              {cargoIds.reduce((total, id) => total + cargo[id].value, 0)} CR
            </b>
          </span>
          <span>
            Starting balance <b>{rules.startingCash} CR</b>
          </span>
        </div>
        <button className="primary" onClick={accept}>
          Accept contract <Icon name="arrow" />
        </button>
      </div>
    </section>
  )
}
