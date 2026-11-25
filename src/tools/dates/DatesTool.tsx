import { ToolLayout } from '../../components/ToolLayout'
import { FormulaDesk } from '../../components/FormulaDesk'
import { DATE_FORMULAS } from '../../lib/dateMath'

export default function DatesTool() {
  return (
    <ToolLayout title="Date maths" lede="ISO week, day of year, leap years, and the span between two dates.">
      <FormulaDesk formulas={DATE_FORMULAS} />
    </ToolLayout>
  )
}
