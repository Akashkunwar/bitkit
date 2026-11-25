import { ToolLayout } from '../../components/ToolLayout'
import { FormulaDesk } from '../../components/FormulaDesk'
import { BODY_FORMULAS } from '../../lib/body'

export default function BodyTool() {
  return (
    <ToolLayout
      title="Body estimates"
      lede="Body fat, a dosing weight, heart-rate zones, pace, a due date, and a BAC estimate. Planning figures, not medical advice."
    >
      <FormulaDesk formulas={BODY_FORMULAS} />
    </ToolLayout>
  )
}
