import { PDFDocument, type PDFCheckBox, type PDFDropdown, type PDFField, type PDFRadioGroup, type PDFTextField } from 'pdf-lib'

export type FormFieldView = {
  name: string
  type: 'text' | 'checkbox' | 'dropdown' | 'radio' | 'other'
  value: string
  options?: string[]
}

function fieldType(field: PDFField): FormFieldView['type'] {
  const ctor = field.constructor.name
  if (ctor.includes('Text')) return 'text'
  if (ctor.includes('Check')) return 'checkbox'
  if (ctor.includes('Dropdown') || ctor.includes('OptionList')) return 'dropdown'
  if (ctor.includes('Radio')) return 'radio'
  return 'other'
}

function readValue(field: PDFField): string {
  const type = fieldType(field)
  try {
    if (type === 'text') return (field as PDFTextField).getText() ?? ''
    if (type === 'checkbox') return (field as PDFCheckBox).isChecked() ? 'true' : 'false'
    if (type === 'dropdown') return (field as PDFDropdown).getSelected()?.[0] ?? ''
    if (type === 'radio') return (field as PDFRadioGroup).getSelected() ?? ''
  } catch {
    return ''
  }
  return ''
}

function readOptions(field: PDFField): string[] | undefined {
  const type = fieldType(field)
  try {
    if (type === 'dropdown') return (field as PDFDropdown).getOptions()
    if (type === 'radio') return (field as PDFRadioGroup).getOptions()
  } catch {
    return undefined
  }
  return undefined
}

export async function listFormFields(bytes: Uint8Array): Promise<FormFieldView[]> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return pdf.getForm().getFields().map((field) => ({
    name: field.getName(),
    type: fieldType(field),
    value: readValue(field),
    options: readOptions(field),
  }))
}

export async function fillForm(bytes: Uint8Array, values: Record<string, string>): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = pdf.getForm()
  for (const field of form.getFields()) {
    const name = field.getName()
    if (!(name in values)) continue
    const next = values[name]
    const type = fieldType(field)
    try {
      if (type === 'text') (field as PDFTextField).setText(next)
      else if (type === 'checkbox') {
        const box = field as PDFCheckBox
        if (next === 'true' || next === 'on' || next === '1') box.check()
        else box.uncheck()
      } else if (type === 'dropdown') (field as PDFDropdown).select(next)
      else if (type === 'radio' && next) (field as PDFRadioGroup).select(next)
    } catch {
      /* skip unwritable field */
    }
  }
  form.updateFieldAppearances()
  return pdf.save()
}
