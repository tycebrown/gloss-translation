export const toMarkDown = (raw: string): string => {
  return raw
    .replaceAll('<Level1>', '\n# ')
    .replaceAll('<Level2>', '\n## ')
    .replaceAll('<Level3>', '\n### ')
    .replaceAll('<Level4>', '\n#### ')
    .replaceAll('</Level1>', '\n')
    .replaceAll('</Level2>', '\n')
    .replaceAll('</Level3>', '\n')
    .replaceAll('</Level4>', '\n')
    .replaceAll('<b>', '**')
    .replaceAll('</b>', '**')
    .replaceAll('<br>', '\n\n')
    .replaceAll('<br />', '\n\n')
    .replaceAll('<lb />', '\n\n') // I think it is short for "line break"
    .replaceAll('<BR>', '\n\n')
    .replaceAll('<B>', '\n\n')
    .replaceAll('<BR />', '\n\n')
    .replaceAll('<i>', '*')
    .replaceAll('</i>', '*')
    .replaceAll(/<ref=".*">/g, '')
    .replaceAll(/<ref='.*'>/g, '')
    .replaceAll('</ref>', '')
    .replaceAll(/\[?<a[^>]*>/g, '')
    .replaceAll('</a>]', '')
    .replaceAll('</a>', '')
    .replaceAll('<u>', '') // Markdown doesn't have underline
    .replaceAll('</u>', '')
    .replaceAll('<date>', '')
    .replaceAll('</date>', '');
};
