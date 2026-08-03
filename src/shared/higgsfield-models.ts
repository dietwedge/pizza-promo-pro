export const higgsfieldModelIds = [
  'gpt_image_2', 'nano_banana_flash', 'nano_banana_2_lite', 'nano_banana_pro', 'z_image',
  'seedance_2_0', 'kling3_0_turbo', 'kling3_0', 'seedance1_5', 'veo3_1_lite'
] as const

export type HiggsfieldModelId = typeof higgsfieldModelIds[number]
export type HiggsfieldMediaKind = 'image' | 'video'
export type HiggsfieldAspectRatio = '1:1' | '4:5' | '9:16' | '16:9'

export type HiggsfieldModelChoice = {
  id: HiggsfieldModelId
  label: string
  kind: HiggsfieldMediaKind
  recommendation: 'recommended' | 'budget' | 'specialist'
  bestFor: string
  supportedAspects: HiggsfieldAspectRatio[]
  outputSummary: string
}

export const higgsfieldModelChoices: HiggsfieldModelChoice[] = [
  {id:'gpt_image_2',label:'GPT Image 2',kind:'image',recommendation:'recommended',bestFor:'Polished promotions, readable text, menus, and general-purpose visuals.',supportedAspects:['1:1','4:5','9:16','16:9'],outputSummary:'high quality · 2K'},
  {id:'nano_banana_flash',label:'Nano Banana 2',kind:'image',recommendation:'specialist',bestFor:'Creative food imagery, styled concepts, and reference-driven work.',supportedAspects:['1:1','4:5','9:16','16:9'],outputSummary:'balanced · 2K'},
  {id:'nano_banana_2_lite',label:'Nano Banana 2 Lite',kind:'image',recommendation:'budget',bestFor:'Fast, lower-cost drafts and simple social visuals.',supportedAspects:['1:1','4:5','9:16','16:9'],outputSummary:'fast · 1K'},
  {id:'nano_banana_pro',label:'Nano Banana Pro',kind:'image',recommendation:'specialist',bestFor:'More demanding compositions and high-detail creative work.',supportedAspects:['1:1','4:5','9:16','16:9'],outputSummary:'advanced · 2K'},
  {id:'z_image',label:'Z Image',kind:'image',recommendation:'budget',bestFor:'Quick, inexpensive concept testing and volume iteration.',supportedAspects:['1:1','4:5','9:16','16:9'],outputSummary:'fast draft'},
  {id:'seedance_2_0',label:'Seedance 2.0',kind:'video',recommendation:'recommended',bestFor:'Cinematic motion, serious production, and multi-shot concepts.',supportedAspects:['1:1','4:5','9:16','16:9'],outputSummary:'5 seconds · 720p'},
  {id:'kling3_0_turbo',label:'Kling 3.0 Turbo',kind:'video',recommendation:'budget',bestFor:'Fast, cost-conscious social clips with clean motion.',supportedAspects:['1:1','9:16','16:9'],outputSummary:'5 seconds · 720p'},
  {id:'kling3_0',label:'Kling 3.0',kind:'video',recommendation:'specialist',bestFor:'Controlled single-scene commercials with generated sound.',supportedAspects:['1:1','9:16','16:9'],outputSummary:'5 seconds · standard'},
  {id:'seedance1_5',label:'Seedance 1.5 Pro',kind:'video',recommendation:'budget',bestFor:'Clean, lower-cost clips that do not need complex cuts.',supportedAspects:['1:1','4:5','9:16','16:9'],outputSummary:'4 seconds · 720p'},
  {id:'veo3_1_lite',label:'Google Veo 3.1 Lite',kind:'video',recommendation:'specialist',bestFor:'Fast campaign variations and higher-volume video work.',supportedAspects:['9:16','16:9'],outputSummary:'4 seconds · no audio'}
]

