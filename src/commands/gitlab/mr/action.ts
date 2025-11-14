import { globalConfig } from '@/config'
import { GitlabAutomator } from '@/playwright/gitlabAutomator'

export async function autoMerge(url: string) {
  const ga = await GitlabAutomator.createCustomWebsiteAutomator(
    globalConfig.playwrightConfig.websiteOption.gitlab,
  )
  await ga.autoMerge(url)
}
