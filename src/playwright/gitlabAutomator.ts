import {
  generateMergePaths,
  sleepAsync,
  WebsiteAutomator,
  WebsiteAutomatorUserConfig,
} from '@xhgj/xh-jsutils'
import { Page } from 'playwright'

export type ProjectInfo = {
  group: string
  subGroup: string
  project: string
  subProject: string
}

/**
 * 从合并请求上能获得的项目信息
 */
export type MergeRequestInfo = ProjectInfo & {
  mergeRequestId: string
}
export class GitlabAutomator extends WebsiteAutomator {
  private websiteOption
  constructor(options: WebsiteAutomatorUserConfig) {
    super(options)
    this.websiteOption = options
  }
  static async createCustomWebsiteAutomator(
    options: WebsiteAutomatorUserConfig,
  ) {
    const ca = new GitlabAutomator(options)
    await ca.init()
    return ca
  }
  // 这里放网站相关的自动化封装
  async login() {
    await this.executeInContext(async ({ page, config }) => {
      const loginOptions = this.websiteOption.loginOptions
      await page
        .getByRole('textbox', { name: 'Username or email' })
        .fill(loginOptions.username)
      await page
        .getByRole('textbox', { name: 'Password' })
        .fill(loginOptions.password)
      await page.locator('label').filter({ hasText: 'Remember me' }).click()
      await page.getByRole('button', { name: 'Sign in' }).click()
    })
  }

  async prepareHome() {
    await this.executeInContext(async ({ page, config }) => {
      if (!this.websiteOption.siteUrl) {
        throw new Error('siteUrl is required')
        return
      }
      await page.goto(this.websiteOption.siteUrl)
    })
  }
  /**
   * 确保登录完成
   */
  async ensureLoggedIn() {
    await this.executeInContext(async ({ page }) => {
      const currentUrl = await page.url()
      if (currentUrl.includes('users/sign_in')) {
        await this.login()
      }
    })
  }
  isMergePage(url: string) {
    if (url.includes('merge_requests')) {
      return true
    }
    return false
  }
  /**
   * 从合并请求页面获取信息
   * @param mrPage
   */
  async paseMrPage(mrPage: Page) {
    // 判断是否处于合并请求页面
    const curUrl = mrPage.url()
    if (!curUrl.includes('merge_requests')) {
      throw new Error('不是合并请求页面')
    }
    const sourceBranch = await mrPage
      .locator('.js-source-branch a')
      .textContent()
    const targetBranch = await mrPage.locator('.js-target-branch').textContent()
  }
  /**
   * 提供合并页面的url，执行自动合并
   * @param mergeRequestUrl
   */
  async autoMerge(mergeRequestUrl: string) {
    await this.executeInContext(async ({ page }) => {
      await page.goto(mergeRequestUrl)
      const currentUrl = await page.url()
      if (!this.isMergePage(currentUrl)) {
        await this.ensureLoggedIn()
      }
      const currentUrl2 = await page.url()
      if (this.isMergePage(currentUrl2)) {
        // http://192.168.27.159:18080/xhgj/srm/srm-ui/web/-/merge_requests/5337
        const mrInfo = GitlabAutomator.parseGitlabUrl(
          currentUrl2,
          'mergeRequest',
        ) as MergeRequestInfo
        console.log('当前在合并', mrInfo)
        if (!mrInfo) {
          throw new Error('无法解析mergeRequest url')
        }
        this.executeInContext(async ({ page }) => {
          // 点击合并按钮
          await page.getByRole('button', { name: 'Merge' }).click()
          // 点击确认合并按钮
          await page.getByRole('button', { name: 'Merge' }).click()
        })
        // await this.gitlabMerge({
        //   projectInfo: mrInfo,
        //   branchRoutes: ['dev', 'test'],
        // })
      }
    })
  }

  /**
   * 提供项目信息，获取新的合并页面的url
   * @param projectInfo
   */
  getMergeNewPageUrl(projectInfo: ProjectInfo) {
    const { group, subGroup, project, subProject } = projectInfo
    const url = `${this.websiteOption.siteUrl}${group}/${subGroup}/${project}/${subProject}/-/merge_requests/new`
    return url
  }

  /**
   * 传入项目信息
   */
  async gitlabMerge(options: {
    projectInfo?: ProjectInfo
    projectUrl?: string // 改为可选参数
    branchRoutes: string[] // 分支合并路径
  }) {
    // 确保至少有一个项目信息来源
    if (!options.projectInfo && !options.projectUrl) {
      throw new Error('必须提供 projectInfo 或 projectUrl 中的一个')
    }
    // 如果提供了 URL，解析项目信息
    const projectInfo =
      options.projectInfo ||
      (GitlabAutomator.parseGitlabUrl(
        options.projectUrl!,
        'project',
      ) as ProjectInfo)

    if (!projectInfo) {
      throw new Error('无法获取有效的项目信息')
    }

    const { branchRoutes } = options
    const mergeRoutes = generateMergePaths(branchRoutes)
    const mergeNewUrl = this.getMergeNewPageUrl(projectInfo)
    await this.executeInContext(async ({ page }) => {
      for (const route of mergeRoutes) {
        const [sourceBranch, targetBranch] = route
        await page.goto(mergeNewUrl)
        await page.getByRole('button', { name: 'Select source branch' }).click()
        await page
          .getByRole('searchbox', { name: 'Search branches' })
          .fill(sourceBranch)
        await page
          .getByRole('link', { name: sourceBranch, exact: true })
          .click()
        // await sleepAsync(500)
        await page.getByRole('button', { name: 'prod' }).click()
        await page
          .getByRole('searchbox', { name: 'Search branches' })
          .fill(targetBranch)
        // await sleepAsync(500)
        await page
          .getByRole('link', { name: targetBranch, exact: true })
          .click()
        await page
          .getByRole('button', { name: 'Compare branches and continue' })
          .click()

        // 判断是否进入合并页面
        // 如果进入合并页面，可以选择合并方式
        await page.getByText('Assignee', { exact: true })

        // 确保标题输入框可见
        // await page.waitForSelector('role=textbox[name="Title"]')
        await sleepAsync(500)
        const titleContent = await page
          .getByRole('textbox', { name: 'Title' })
          .inputValue()
        if (!titleContent) {
          throw new Error('无法获取title')
        }
        const mergeDeleteCheckbox = await page.getByRole('checkbox', {
          name: 'Delete source branch when',
        })
        if (await mergeDeleteCheckbox.isVisible()) {
          await mergeDeleteCheckbox.uncheck()
        }

        if (titleContent?.includes('WIP')) {
          // WIP需要报错，让用户手动处理
          throw new Error('WIP，需要手动处理')
        }
        await page.getByRole('button', { name: 'Submit merge request' }).click()
        await page.getByRole('button', { name: 'Merge', exact: true }).click()

        // 等待合并完成
        await page.waitForSelector('.issuable-status-box:has-text("Merged")')
        // await page.getByRole('textbox', { name: 'Title' })
        console.log(`成功创建${sourceBranch}-> ${targetBranch}的合并`)
      }
    })
  }
  /**
   * 通用的 GitLab URL 解析方法，可以解析项目 URL 和合并请求 URL
   * @param url GitLab URL，可以是项目 URL 或合并请求 URL
   * @param type 指定解析类型，'project' 或 'mergeRequest'，如果不指定则自动判断
   * @returns 解析结果，如果是合并请求 URL 则返回 MergeRequestInfo，否则返回 ProjectInfo，解析失败返回 null
   */
  static parseGitlabUrl(
    url: string,
    type?: 'project' | 'mergeRequest',
  ): ProjectInfo | MergeRequestInfo | null {
    // 根据 URL 或指定的 type 判断是项目 URL 还是合并请求 URL
    const isMergeRequest =
      type === 'mergeRequest' || url.includes('/-/merge_requests/')

    // 选择合适的正则表达式
    const regex = isMergeRequest
      ? /http:\/\/.*\/(?<group>[^\/]+)\/(?<subGroup>[^\/]+)\/(?<project>[^\/]+)\/(?<subProject>[^\/]+)\/-\/merge_requests\/(?<mergeRequestId>\d+)/
      : /http:\/\/.*\/(?<group>[^\/]+)\/(?<subGroup>[^\/]+)\/(?<project>[^\/]+)\/(?<subProject>[^\/]+)/

    const match = url.match(regex)

    if (match?.groups) {
      const { group, subGroup, project, subProject } = match.groups

      // 基本的项目信息
      const projectInfo: ProjectInfo = {
        group,
        subGroup,
        project,
        subProject,
      }

      // 如果是合并请求 URL，则添加 mergeRequestId
      if (isMergeRequest && match.groups.mergeRequestId) {
        return {
          ...projectInfo,
          mergeRequestId: match.groups.mergeRequestId,
        } as MergeRequestInfo
      }

      return projectInfo
    } else {
      return null
    }
  }

  /**
   * 使用正则表达式从合并请求 URL 中解析信息
   * @param mergeUrl 合并请求 URL
   * @returns 包含 group, project, subProject 和 mergeRequestId 的对象，如果 URL 不匹配则返回 null
   * @deprecated 请使用 parseGitlabUrl 方法代替
   */
  static parseMergeRequestUrl(mergeUrl: string) {
    return GitlabAutomator.parseGitlabUrl(
      mergeUrl,
      'mergeRequest',
    ) as MergeRequestInfo | null
  }

  /**
   * 从项目 URL 解析出项目信息
   * @param projectURL 项目 URL，例如 'http://192.168.27.159:18080/xhgj/srm/srm-ui/web'
   * @returns 包含 group, subGroup, project, subProject 的对象，如果 URL 不匹配则返回 null
   * @deprecated 请使用 parseGitlabUrl 方法代替
   */
  static parseProjectUrl(projectURL: string): ProjectInfo | null {
    return GitlabAutomator.parseGitlabUrl(
      projectURL,
      'project',
    ) as ProjectInfo | null
  }
}
