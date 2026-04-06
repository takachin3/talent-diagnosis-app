import mammoth from 'mammoth'

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.txt')) {
    return await file.text()
  }
  if (name.endsWith('.docx')) {
    const buf = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buf })
    return result.value
  }
  throw new Error('対応形式は .txt または .docx のみです')
}
