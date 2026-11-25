import { useMemo, useState } from 'react'
import { useQueryMode } from '../../lib/useQueryMode'
import { Segmented } from '../../components/Segmented'
import { ToolLayout } from '../../components/ToolLayout'
import { BoardTimer } from './BoardTimer'
import { Bracket } from './Bracket'
import { CatPlay } from './CatPlay'
import { Charades } from './Charades'
import { ClassroomCountdown } from './ClassroomCountdown'
import { ClassroomScreen } from './ClassroomScreen'
import { DiceRoll } from './DiceRoll'
import { Hunger } from './Hunger'
import { Imposter } from './Imposter'
import { Meditation } from './Meditation'
import { NotationRoll } from './NotationRoll'
import { Race } from './Race'
import { Scoreboard } from './Scoreboard'
import { splitList } from './shared'
import { WhiteElephant } from './WhiteElephant'

type Mode =
  | 'screen'
  | 'countdown'
  | 'score'
  | 'meditate'
  | 'dice'
  | 'notation'
  | 'board'
  | 'imposter'
  | 'charades'
  | 'elephant'
  | 'cats'
  | 'bracket'
  | 'horse'
  | 'duck'
  | 'reindeer'
  | 'hunger'
  | 'marble'
  | 'country'

const MODES: { value: Mode; label: string }[] = [
  { value: 'screen', label: 'Classroom screen' },
  { value: 'countdown', label: 'Classroom countdown' },
  { value: 'score', label: 'Scoreboard' },
  { value: 'meditate', label: 'Meditation timer' },
  { value: 'dice', label: '3D physics dice' },
  { value: 'notation', label: 'D&D dice notation' },
  { value: 'board', label: 'Board game timer' },
  { value: 'imposter', label: 'Imposter' },
  { value: 'charades', label: 'Charades' },
  { value: 'elephant', label: 'White elephant' },
  { value: 'cats', label: 'Games for cats' },
  { value: 'bracket', label: 'Bracket' },
  { value: 'horse', label: 'Horse race' },
  { value: 'duck', label: 'Duck race' },
  { value: 'reindeer', label: 'Reindeer race' },
  { value: 'hunger', label: 'Hunger Games' },
  { value: 'marble', label: 'Marble race' },
  { value: 'country', label: 'Country marble race' },
]

const RACES: { mode: Mode; label: string; noun: string; step: string; initial: string }[] = [
  {
    mode: 'horse',
    label: 'Horse race',
    noun: 'Horses',
    step: 'Step the horses',
    initial: 'Chestnut\nBay\nGrey\nPinto',
  },
  {
    mode: 'duck',
    label: 'Duck race',
    noun: 'Ducks',
    step: 'Step the ducks',
    initial: 'Mallard\nTeal\nPintail\nWigeon',
  },
  {
    mode: 'reindeer',
    label: 'Reindeer race',
    noun: 'Reindeer',
    step: 'Step the reindeer',
    initial: 'Dasher\nDancer\nPrancer\nVixen',
  },
  {
    mode: 'marble',
    label: 'Marble race',
    noun: 'Marbles',
    step: 'Step the marbles',
    initial: 'Red\nBlue\nGreen\nGold',
  },
  {
    mode: 'country',
    label: 'Country marble race',
    noun: 'Countries',
    step: 'Step the countries',
    initial: 'Kenya\nJapan\nBrazil\nNorway',
  },
]

export default function PlayroomTool() {
  const [mode, setMode] = useQueryMode(
    MODES.map((item) => item.value),
    'screen',
  )
  const [roster, setRoster] = useState('Asha\nDev\nMina\nRohit')
  const names = useMemo(() => splitList(roster), [roster])
  const race = RACES.find((item) => item.mode === mode)

  return (
    <ToolLayout
      title="Playroom"
      lede="Classroom picks, timers, dice, party games, and races. Rolls and shuffles stay in this tab."
    >
      <Segmented label="Mode" value={mode} options={MODES} onChange={setMode} />
      {mode === 'screen' ? <ClassroomScreen names={names} roster={roster} onRoster={setRoster} /> : null}
      {mode === 'countdown' ? <ClassroomCountdown /> : null}
      {mode === 'score' ? <Scoreboard names={names} roster={roster} onRoster={setRoster} /> : null}
      {mode === 'meditate' ? <Meditation /> : null}
      {mode === 'dice' ? <DiceRoll /> : null}
      {mode === 'notation' ? <NotationRoll /> : null}
      {mode === 'board' ? <BoardTimer names={names} roster={roster} onRoster={setRoster} /> : null}
      {mode === 'imposter' ? <Imposter names={names} roster={roster} onRoster={setRoster} /> : null}
      {mode === 'charades' ? <Charades /> : null}
      {mode === 'elephant' ? <WhiteElephant names={names} roster={roster} onRoster={setRoster} /> : null}
      {mode === 'cats' ? <CatPlay /> : null}
      {mode === 'bracket' ? <Bracket names={names} roster={roster} onRoster={setRoster} /> : null}
      {race ? <Race key={mode} label={race.label} noun={race.noun} step={race.step} initial={race.initial} /> : null}
      {mode === 'hunger' ? <Hunger names={names} roster={roster} onRoster={setRoster} /> : null}
    </ToolLayout>
  )
}
