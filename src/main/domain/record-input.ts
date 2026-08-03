export function normalizeRecordInput(value:Record<string,unknown>):Record<string,unknown>{
  const result:Record<string,unknown>={}
  for(const [key,entry] of Object.entries(value))result[key.replace(/[A-Z]/g,letter=>`_${letter.toLowerCase()}`).replace(/([a-zA-Z])(\d)/g,'$1_$2')]=entry
  return result
}
