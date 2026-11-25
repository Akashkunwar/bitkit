import { ToolLayout } from '../../components/ToolLayout'
import { FormulaDesk } from '../../components/FormulaDesk'
import { NUMBER_FORMULAS } from '../../lib/deskNumbers'

export default function NumbersTool() {
  return (
    <ToolLayout
      title="Number desk"
      lede="Roman numerals, factors, fractions, combinations, and the shape of a list of numbers."
    >
      <FormulaDesk formulas={NUMBER_FORMULAS} />
    </ToolLayout>
  )
}
