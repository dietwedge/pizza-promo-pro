import { parseContentAgentOutput } from '../domain/content-agent-output'
import type { AiCompletion, AiMessage } from './ai-model-provider'
import type { ContentAgent, ContentAgentRequest, ContentAgentResult } from './content-agent'

export class ConfiguredContentAgent implements ContentAgent {
  readonly id='configured-content-producer'
  constructor(private readonly complete:(messages:readonly AiMessage[])=>Promise<AiCompletion>){}
  async produce(request:ContentAgentRequest):Promise<ContentAgentResult>{
    const platforms=[...new Set(request.platforms)]
    const completion=await this.complete([
      {role:'system',content:`You are the final-copy writer inside Pizza Promo Pro. The user's input is strategy and creative direction only; never paste, summarize, or expose its planning scaffolding in a post. Write finished customer-facing social captions using only the supplied verified facts. Never invent prices, offers, dates, hours, ingredients, coupon codes, awards, testimonials, allergens, health claims, or dietary claims.

Return only one JSON object with exactly these fields:
{"concept":"short internal package title","variants":[{"platform":"requested_platform","copy":"finished publishable caption"}],"mediaPrompts":[{"kind":"image","prompt":"visual production prompt"}],"suggestedTiming":{"rationale":"short operational suggestion","localHour":17}}

Return exactly one variant for each requested platform and no others. Captions must contain no analysis, markdown headings, labels such as Theme, Focus, Suggested Caption Angle, Visual Suggestion, Strategy, or Rationale, and no commentary about creating the post. Adapt voice, length, hashtags, and calls to action to each platform. The concept is an internal title, not the user's strategy text. Human review is always required.

Requested platforms: ${JSON.stringify(platforms)}
Verified sources: ${JSON.stringify(request.sources)}`},
      {role:'user',content:`Use this direction to write the final platform posts. Do not repeat the direction itself:\n${request.objective}`}
    ])
    return parseContentAgentOutput(completion.text,platforms,completion.provider,completion.model,request.sources)
  }
}
