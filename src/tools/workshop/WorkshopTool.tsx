import { ToolLayout } from '../../components/ToolLayout'
import { FormulaDesk } from '../../components/FormulaDesk'
import { WORKSHOP_FORMULAS } from '../../lib/workshop'

export default function WorkshopTool() {
  return (
    <ToolLayout
      title="Workshop maths"
      lede="Tips, prices, savings, paint, tiles, concrete, freight weight, and a recipe scaled to new servings."
    >
      <FormulaDesk formulas={WORKSHOP_FORMULAS} />
    </ToolLayout>
  )
}
