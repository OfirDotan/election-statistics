import amcha from '../assets/parties/amcha.svg'
import democrats from '../assets/parties/democrats.svg'
import israelBeiteinu from '../assets/parties/israel_beiteinu.svg'
import jointList from '../assets/parties/joint_list.svg'
import likud from '../assets/parties/likud.svg'
import otzma from '../assets/parties/otzma.svg'
import raam from '../assets/parties/raam.svg'
import reservists from '../assets/parties/reservists.svg'
import rzp from '../assets/parties/rzp.png'
import shas from '../assets/parties/shas.svg'
import together from '../assets/parties/together.svg'
import utj from '../assets/parties/utj.svg'
import yashar from '../assets/parties/yashar.png'

// Explicit imports, not a runtime lookup: Vite fingerprints and copies these into the build
const LOGOS: Record<string, string> = {
  'likud.svg': likud,
  'yashar.png': yashar,
  'together.svg': together,
  'democrats.svg': democrats,
  'joint_list.svg': jointList,
  'israel_beiteinu.svg': israelBeiteinu,
  'otzma.svg': otzma,
  'shas.svg': shas,
  'utj.svg': utj,
  'rzp.png': rzp,
  'raam.svg': raam,
  'reservists.svg': reservists,
  'amcha.svg': amcha,
}

/** Party logo when one was sourced; nothing otherwise (14 of the 37 lists have no free image). */
export function PartyLogo({ logo }: { logo?: string }) {
  const src = logo ? LOGOS[logo] : undefined
  return src ? <img className="party-logo" src={src} alt="" aria-hidden="true" loading="lazy" /> : <span className="dot" aria-hidden="true" />
}
