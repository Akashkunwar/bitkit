import { ToolLayout } from '../../components/ToolLayout'
import { FormulaDesk } from '../../components/FormulaDesk'
import { PHYSICS_FORMULAS } from '../../lib/physics'

export default function PhysicsTool() {
  return (
    <ToolLayout
      title="Physics desk"
      lede="Ohm’s law, waves, energy, force, the ideal gas law, and half-life. Textbook formulas, solved in the tab."
    >
      <FormulaDesk formulas={PHYSICS_FORMULAS} />
    </ToolLayout>
  )
}
