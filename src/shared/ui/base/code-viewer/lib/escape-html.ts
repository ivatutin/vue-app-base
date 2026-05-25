export function escapeHtml (code: string) {
  return code.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;<br>')
    .replace(/&lt;\//g, '<br>&lt;/')
    .replace(/\n/g, '<br>')
}
