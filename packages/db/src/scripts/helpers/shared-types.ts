type ParseLexiconFunctionType = (
  filename: string,
  keys: string[]
) => Promise<Record<string, Record<string, string>>>;
